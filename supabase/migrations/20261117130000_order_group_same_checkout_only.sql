-- Order groups must come from the same checkout (primary + addon Stripe metadata),
-- not from "paid within 10 minutes." Separate checkouts stay separate orders.

create or replace function public.create_medication_order_on_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub              record;
  v_med              record;
  v_state            text;
  v_state_provider   uuid;
  v_default_provider uuid;
  v_provider         uuid;
  v_variant          uuid;
  v_kind             text;
  v_needs            boolean;
  v_status           text;
  v_req_id           uuid;
  v_group            uuid;
  v_sib_group        uuid;
  v_sib_provider     uuid;
  v_sib_needs        boolean;
  v_sib_status       text;
  v_join_consult     boolean := false;
  v_patient_key      text;
  v_session          uuid;
  v_intake_ready     boolean := false;
  v_from_shop        boolean := false;
  v_session_owns     boolean := false;
  v_invoice_lines    jsonb;
  v_primary_stripe   text;
begin
  if NEW.status is distinct from 'succeeded' or NEW.stripe_subscription_id is null then
    return NEW;
  end if;

  if NEW.stripe_invoice_id is not null and exists (
    select 1 from public.medication_requests where stripe_invoice_id = NEW.stripe_invoice_id
  ) then
    return NEW;
  end if;

  select id, user_id, session_id, package_id, medicine_id, created_at
    into v_sub
    from public.subscriptions
    where stripe_subscription_id = NEW.stripe_subscription_id
    order by created_at desc
    limit 1;
  if v_sub.id is null or v_sub.medicine_id is null then
    return NEW;
  end if;

  select name, requires_consultation, requires_followup
    into v_med
    from public.medicines
    where id = v_sub.medicine_id;
  if not found then
    return NEW;
  end if;

  select exists (
    select 1
    from public.shop_checkout_orders o
    where o.status = 'paid'
      and (
        (
          NEW.stripe_subscription_id is not null
          and o.stripe_subscription_id = NEW.stripe_subscription_id
        )
        or (
          NEW.stripe_invoice_id is not null
          and o.stripe_invoice_id = NEW.stripe_invoice_id
        )
      )
  ) into v_from_shop;

  v_session := v_sub.session_id;
  if v_session is null and v_sub.user_id is not null and not coalesce(v_from_shop, false) then
    select s.id into v_session
    from public.intake_sessions s
    where s.claimed_by_user_id = v_sub.user_id
      and (
        s.status = 'completed'
        or exists (
          select 1
          from public.intake_session_questionnaire_responses q
          where q.session_id = s.id
        )
      )
    order by s.updated_at desc
    limit 1;
    if v_session is not null then
      update public.subscriptions
        set session_id = v_session
        where id = v_sub.id
          and session_id is null;
    end if;
  end if;

  if coalesce(v_from_shop, false) and v_session is not null then
    select
      (
        s.stripe_subscription_id is not null
        and s.stripe_subscription_id = NEW.stripe_subscription_id
      )
      or (
        not exists (
          select 1
          from public.subscriptions older
          where older.user_id = v_sub.user_id
            and older.id <> v_sub.id
            and older.created_at < v_sub.created_at
            and (
              older.session_id = s.id
              or (
                s.stripe_subscription_id is not null
                and older.stripe_subscription_id = s.stripe_subscription_id
              )
            )
        )
        and (
          s.stripe_subscription_id is null
          or s.stripe_subscription_id = NEW.stripe_subscription_id
        )
        and s.created_at >= v_sub.created_at - interval '1 hour'
      )
    into v_session_owns
    from public.intake_sessions s
    where s.id = v_session;

    if not found or not coalesce(v_session_owns, false) then
      update public.subscriptions
        set session_id = null
        where id = v_sub.id
          and session_id = v_session;
      v_session := null;
      v_session_owns := false;
    end if;
  end if;

  if exists (select 1 from public.medication_requests where subscription_id = v_sub.id) then
    v_kind := 'followup';
    v_needs := coalesce(v_med.requires_followup, false);
  else
    v_kind := 'initial';
    v_needs := coalesce(v_med.requires_consultation, false);
  end if;
  v_status := case when v_needs then 'pending_review' else 'approved' end;

  if v_sub.user_id is not null then
    select state_code into v_state from public.profiles where id = v_sub.user_id;
  end if;
  if v_state is null and v_session is not null then
    select state_code into v_state from public.intake_sessions where id = v_session;
  end if;

  if v_state is not null then
    select pr.id into v_state_provider
      from public.providers pr
      where pr.is_active
        and upper(v_state) = any (select upper(x) from unnest(pr.license_states) x)
      limit 1;
  end if;

  select id into v_default_provider from public.providers where is_default and is_active limit 1;

  if not v_needs then
    v_provider := v_default_provider;
  elsif v_state_provider is not null then
    v_provider := null;
  else
    v_provider := v_default_provider;
  end if;

  v_patient_key := coalesce(v_sub.user_id::text, v_session::text, NEW.id::text);
  perform pg_advisory_xact_lock(hashtext(v_patient_key));

  -- Same-checkout link: invoice line metadata from the shop cart
  -- (role=addon + checkout_primary_stripe_subscription_id, or primary with addon_package_ids).
  v_invoice_lines := coalesce(
    NEW.raw_event->'lines'->'data',
    NEW.raw_event->'data'->'object'->'lines'->'data',
    '[]'::jsonb
  );

  select nullif(line->'metadata'->>'checkout_primary_stripe_subscription_id', '')
    into v_primary_stripe
  from jsonb_array_elements(v_invoice_lines) as line
  where nullif(line->'metadata'->>'checkout_primary_stripe_subscription_id', '') is not null
  limit 1;

  if v_primary_stripe is not null then
    select r.order_group_id, r.provider_id, r.requires_consultation, r.status
      into v_sib_group, v_sib_provider, v_sib_needs, v_sib_status
      from public.medication_requests r
      join public.subscriptions s on s.id = r.subscription_id
      where s.stripe_subscription_id = v_primary_stripe
        and r.kind = v_kind
      order by r.created_at asc
      limit 1;
  end if;

  -- Addon may land before the primary; join to an existing addon that points at this sub.
  if v_sib_group is null then
    select r.order_group_id, r.provider_id, r.requires_consultation, r.status
      into v_sib_group, v_sib_provider, v_sib_needs, v_sib_status
      from public.medication_requests r
      join public.subscriptions s on s.id = r.subscription_id
      join public.payments p on p.id = r.payment_id
      cross join lateral jsonb_array_elements(
        coalesce(
          p.raw_event->'lines'->'data',
          p.raw_event->'data'->'object'->'lines'->'data',
          '[]'::jsonb
        )
      ) as line
      where r.kind = v_kind
        and (
          (v_sub.user_id is not null and r.user_id = v_sub.user_id)
          or (v_sub.user_id is null and v_session is not null and r.session_id = v_session)
        )
        and nullif(line->'metadata'->>'checkout_primary_stripe_subscription_id', '')
          = NEW.stripe_subscription_id
      order by r.created_at asc
      limit 1;
  end if;

  if v_sib_group is not null then
    v_group := v_sib_group;
    if v_needs
      or coalesce(v_sib_needs, false)
      or v_sib_status in (
        'pending_review', 'payment_completed', 'provider_assigned', 'awaiting_additional_payment'
      ) then
      v_join_consult := true;
    end if;
  else
    v_group := gen_random_uuid();
  end if;

  if v_join_consult then
    v_needs := true;
    v_status := 'pending_review';
    if v_sib_status in (
      'pending_review', 'payment_completed', 'provider_assigned', 'awaiting_additional_payment'
    ) then
      v_provider := v_sib_provider;
    else
      v_provider := null;
    end if;
  end if;

  if v_session is not null and (not coalesce(v_from_shop, false) or coalesce(v_session_owns, false)) then
    select exists (
      select 1
      from public.intake_sessions s
      where s.id = v_session
        and (
          s.status = 'completed'
          or exists (
            select 1
            from public.intake_session_questionnaire_responses q
            where q.session_id = s.id
          )
        )
    ) into v_intake_ready;
  end if;
  if not coalesce(v_intake_ready, false) then
    v_provider := null;
  end if;

  if v_sub.package_id is not null then
    select variant_id into v_variant from public.packages where id = v_sub.package_id;
  end if;

  insert into public.medication_requests
    (user_id, session_id, subscription_id, payment_id, stripe_invoice_id,
     medicine_id, variant_id, package_id, provider_id, kind, status, requires_consultation,
     order_group_id)
  values
    (v_sub.user_id, v_session, v_sub.id, NEW.id, NEW.stripe_invoice_id,
     v_sub.medicine_id, v_variant, v_sub.package_id, v_provider, v_kind, v_status, v_needs,
     v_group)
  on conflict (stripe_invoice_id) where stripe_invoice_id is not null do nothing
  returning id into v_req_id;

  if v_req_id is null then
    return NEW;
  end if;

  insert into public.medication_request_events (request_id, status, actor_role)
    values (v_req_id, 'payment_completed', 'system');
  if v_provider is not null then
    insert into public.medication_request_events (request_id, status, actor_role)
      values (v_req_id, 'provider_assigned', 'system');
  end if;
  insert into public.medication_request_events (request_id, status, actor_role)
    values (v_req_id, v_status, 'system');

  if v_status = 'approved' then
    insert into public.prescriptions
      (request_id, user_id, provider_id, medicine_id, variant_id, package_id, medicine_name, status)
    values
      (v_req_id, v_sub.user_id, v_provider, v_sub.medicine_id, v_variant, v_sub.package_id, v_med.name, 'generated');
    update public.medication_requests set status = 'prescribed', updated_at = now() where id = v_req_id;
    insert into public.medication_request_events (request_id, status, actor_role)
      values (v_req_id, 'prescribed', 'system');
  end if;

  return NEW;
exception when others then
  raise warning 'create_medication_order_on_payment failed: %', sqlerrm;
  return NEW;
end;
$$;

-- Split groups that were only time-merged (no primary/addon checkout link).
with multi as (
  select order_group_id
  from public.medication_requests
  group by order_group_id
  having count(*) > 1
),
member as (
  select
    r.id,
    r.order_group_id,
    r.payment_id,
    s.stripe_subscription_id,
    row_number() over (partition by r.order_group_id order by r.created_at, r.id) as rn
  from public.medication_requests r
  join multi m on m.order_group_id = r.order_group_id
  left join public.subscriptions s on s.id = r.subscription_id
),
group_subs as (
  select
    order_group_id,
    array_agg(distinct stripe_subscription_id) filter (where stripe_subscription_id is not null) as stripe_subs,
    array_agg(distinct payment_id) filter (where payment_id is not null) as payment_ids
  from member
  group by order_group_id
),
linked as (
  select distinct gs.order_group_id
  from group_subs gs
  join public.payments p
    on p.id = any (gs.payment_ids)
    or (p.stripe_subscription_id is not null and p.stripe_subscription_id = any (gs.stripe_subs))
  cross join lateral jsonb_array_elements(
    coalesce(
      p.raw_event->'lines'->'data',
      p.raw_event->'data'->'object'->'lines'->'data',
      '[]'::jsonb
    )
  ) as line
  where nullif(line->'metadata'->>'checkout_primary_stripe_subscription_id', '') = any (gs.stripe_subs)
     or (
       nullif(line->'metadata'->>'addon_package_ids', '') is not null
       and exists (
         select 1
         from public.payments p2
         cross join lateral jsonb_array_elements(
           coalesce(
             p2.raw_event->'lines'->'data',
             p2.raw_event->'data'->'object'->'lines'->'data',
             '[]'::jsonb
           )
         ) as line2
         where (
             p2.id = any (gs.payment_ids)
             or (p2.stripe_subscription_id is not null and p2.stripe_subscription_id = any (gs.stripe_subs))
           )
           and line2->'metadata'->>'role' = 'addon'
           and nullif(line2->'metadata'->>'checkout_primary_stripe_subscription_id', '') = any (gs.stripe_subs)
       )
     )
)
update public.medication_requests r
set order_group_id = gen_random_uuid(),
    updated_at = now()
from member m
where r.id = m.id
  and m.rn > 1
  and not exists (select 1 from linked l where l.order_group_id = m.order_group_id);
