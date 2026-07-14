create table if not exists public.email_reminders (
  id uuid primary key default gen_random_uuid(),
  reminder_type text not null,
  target_id uuid not null,
  period_key text not null default '',
  sent_at timestamptz not null default now(),
  unique (reminder_type, target_id, period_key)
);

alter table public.email_reminders enable row level security;
