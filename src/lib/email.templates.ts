/**
 * In-repo transactional email templates.
 * Rendered locally, then delivered via Brevo (no Brevo dashboard templates required).
 */

export type EmailTemplateKey =
  | "patient_order_confirmed"
  | "patient_approved"
  | "patient_rejected"
  | "patient_additional_payment"
  | "patient_medicine_changed"
  | "patient_prescription_ready"
  | "patient_sent_to_pharmacy"
  | "patient_shipped"
  | "patient_delivered"
  | "patient_refund_approved"
  | "patient_refund_rejected"
  | "provider_assigned"
  | "provider_ready_for_review"
  | "provider_needs_attention";

export type EmailParams = Record<string, string | number | boolean | null | undefined>;

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

function str(params: EmailParams, key: string, fallback = ""): string {
  const v = params[key];
  if (v === null || v === undefined) return fallback;
  return String(v);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstName(params: EmailParams): string {
  return str(params, "FIRSTNAME") || str(params, "FULLNAME").split(/\s+/)[0] || "there";
}

function orderShort(params: EmailParams): string {
  const id = str(params, "ORDER_ID");
  return id ? id.slice(0, 8).toUpperCase() : "";
}

function cta(url: string, label: string): { html: string; text: string } {
  if (!url) return { html: "", text: "" };
  return {
    html: `<p style="margin:24px 0 0;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#1F2A37;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px;">${escapeHtml(label)}</a></p>`,
    text: `\n${label}: ${url}\n`,
  };
}

function layout(opts: {
  preheader: string;
  title: string;
  bodyHtml: string;
  bodyText: string;
}): RenderedEmail {
  const brand = "Body Inc";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F6F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F2A37;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E9EF;">
          <tr>
            <td style="padding:24px 28px 8px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#6B7785;">${escapeHtml(brand)}</td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;font-size:22px;font-weight:700;line-height:1.3;color:#1F2A37;">${escapeHtml(opts.title)}</td>
          </tr>
          <tr>
            <td style="padding:16px 28px 28px;font-size:15px;line-height:1.55;color:#3B4759;">${opts.bodyHtml}</td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#8A96A3;">${escapeHtml(brand)} · Care notifications</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${brand}\n\n${opts.title}\n\n${opts.bodyText}\n`;
  return { subject: opts.title, html, text };
}

type Builder = (params: EmailParams) => RenderedEmail;

const builders: Record<EmailTemplateKey, Builder> = {
  patient_order_confirmed: (p) => {
    const med = str(p, "MEDICINE_NAME", "your medication");
    const order = orderShort(p);
    const link = cta(str(p, "PORTAL_URL"), "View your order");
    return layout({
      preheader: `Your order for ${med} is confirmed.`,
      title: "Order confirmed",
      bodyHtml: `<p>Hi ${escapeHtml(firstName(p))},</p>
        <p>We've received your payment and created your order${order ? ` <strong>#${escapeHtml(order)}</strong>` : ""} for <strong>${escapeHtml(med)}</strong>.</p>
        <p>A clinician will review your request shortly.</p>${link.html}`,
      bodyText: `Hi ${firstName(p)},\n\nWe've received your payment and created your order${order ? ` #${order}` : ""} for ${med}.\nA clinician will review your request shortly.${link.text}`,
    });
  },

  patient_approved: (p) => {
    const med = str(p, "MEDICINE_NAME", "your medication");
    const note = str(p, "DECISION_NOTE");
    const link = cta(str(p, "PORTAL_URL"), "Open patient portal");
    return layout({
      preheader: `Your consultation for ${med} was approved.`,
      title: "Consultation approved",
      bodyHtml: `<p>Hi ${escapeHtml(firstName(p))},</p>
        <p>Good news — your consultation for <strong>${escapeHtml(med)}</strong> has been approved.</p>
        ${note ? `<p style="margin-top:12px;padding:12px;background:#F4F6F8;border-radius:8px;"><strong>Note:</strong> ${escapeHtml(note)}</p>` : ""}
        ${link.html}`,
      bodyText: `Hi ${firstName(p)},\n\nYour consultation for ${med} has been approved.${note ? `\nNote: ${note}` : ""}${link.text}`,
    });
  },

  patient_rejected: (p) => {
    const med = str(p, "MEDICINE_NAME", "your medication");
    const note = str(p, "DECISION_NOTE");
    const link = cta(str(p, "PORTAL_URL"), "Open patient portal");
    return layout({
      preheader: `Your order for ${med} was not approved. A refund is being processed.`,
      title: "Order not approved",
      bodyHtml: `<p>Hi ${escapeHtml(firstName(p))},</p>
        <p>Your order for <strong>${escapeHtml(med)}</strong> was not approved. Any payment for this order is being refunded.</p>
        ${note ? `<p style="margin-top:12px;padding:12px;background:#F4F6F8;border-radius:8px;"><strong>Reason:</strong> ${escapeHtml(note)}</p>` : ""}
        ${link.html}`,
      bodyText: `Hi ${firstName(p)},\n\nYour order for ${med} was not approved. Any payment for this order is being refunded.${note ? `\nReason: ${note}` : ""}${link.text}`,
    });
  },

  patient_additional_payment: (p) => {
    const med = str(p, "MEDICINE_NAME", "your medication");
    const amount = str(p, "AMOUNT_DUE", "0.00");
    const link = cta(str(p, "PORTAL_URL"), "Complete payment");
    return layout({
      preheader: `Additional payment of $${amount} is required for ${med}.`,
      title: "Additional payment required",
      bodyHtml: `<p>Hi ${escapeHtml(firstName(p))},</p>
        <p>Your clinician updated your treatment to <strong>${escapeHtml(med)}</strong>. An additional payment of <strong>$${escapeHtml(amount)}</strong> is needed before your prescription can be generated.</p>
        ${link.html}`,
      bodyText: `Hi ${firstName(p)},\n\nYour clinician updated your treatment to ${med}. An additional payment of $${amount} is needed before your prescription can be generated.${link.text}`,
    });
  },

  patient_medicine_changed: (p) => {
    const med = str(p, "MEDICINE_NAME", "your medication");
    const credit = str(p, "CREDIT_AMOUNT", "0.00");
    const creditNote =
      Number(credit) > 0 ? ` A credit of $${credit} will apply on your next billing cycle.` : "";
    const link = cta(str(p, "PORTAL_URL"), "Open patient portal");
    return layout({
      preheader: `Your treatment was updated to ${med}.`,
      title: "Treatment updated",
      bodyHtml: `<p>Hi ${escapeHtml(firstName(p))},</p>
        <p>Your order has been updated to <strong>${escapeHtml(med)}</strong>.${creditNote ? ` A credit of <strong>$${escapeHtml(credit)}</strong> will apply on your next billing cycle.` : ""}</p>
        ${link.html}`,
      bodyText: `Hi ${firstName(p)},\n\nYour order has been updated to ${med}.${creditNote}${link.text}`,
    });
  },

  patient_prescription_ready: (p) => {
    const med = str(p, "MEDICINE_NAME", "your medication");
    const link = cta(str(p, "PORTAL_URL"), "View prescription");
    return layout({
      preheader: `Your prescription for ${med} is ready.`,
      title: "Prescription ready",
      bodyHtml: `<p>Hi ${escapeHtml(firstName(p))},</p>
        <p>Your prescription for <strong>${escapeHtml(med)}</strong> has been generated and will move to fulfillment next.</p>
        ${link.html}`,
      bodyText: `Hi ${firstName(p)},\n\nYour prescription for ${med} has been generated and will move to fulfillment next.${link.text}`,
    });
  },

  patient_sent_to_pharmacy: (p) => {
    const med = str(p, "MEDICINE_NAME", "your medication");
    return layout({
      preheader: `Your ${med} order was sent to the pharmacy.`,
      title: "Sent to pharmacy",
      bodyHtml: `<p>Hi ${escapeHtml(firstName(p))},</p>
        <p>Your order for <strong>${escapeHtml(med)}</strong> has been sent to the pharmacy for fulfillment.</p>`,
      bodyText: `Hi ${firstName(p)},\n\nYour order for ${med} has been sent to the pharmacy for fulfillment.`,
    });
  },

  patient_shipped: (p) => {
    const med = str(p, "MEDICINE_NAME", "your medication");
    const tracking = str(p, "TRACKING_NUMBER");
    return layout({
      preheader: tracking
        ? `Your ${med} order shipped. Tracking: ${tracking}`
        : `Your ${med} order has shipped.`,
      title: "Order shipped",
      bodyHtml: `<p>Hi ${escapeHtml(firstName(p))},</p>
        <p>Your order for <strong>${escapeHtml(med)}</strong> is on the way.</p>
        ${tracking ? `<p><strong>Tracking number:</strong> ${escapeHtml(tracking)}</p>` : ""}`,
      bodyText: `Hi ${firstName(p)},\n\nYour order for ${med} is on the way.${tracking ? `\nTracking number: ${tracking}` : ""}`,
    });
  },

  patient_delivered: (p) => {
    const med = str(p, "MEDICINE_NAME", "your medication");
    return layout({
      preheader: `Your ${med} order was delivered.`,
      title: "Order delivered",
      bodyHtml: `<p>Hi ${escapeHtml(firstName(p))},</p>
        <p>Your order for <strong>${escapeHtml(med)}</strong> has been marked as delivered. If anything looks off, reply to this email or contact support.</p>`,
      bodyText: `Hi ${firstName(p)},\n\nYour order for ${med} has been marked as delivered. If anything looks off, reply to this email or contact support.`,
    });
  },

  patient_refund_approved: (p) => {
    const amount = str(p, "AMOUNT", "0.00");
    const link = cta(str(p, "PORTAL_URL"), "Open patient portal");
    return layout({
      preheader: `Your refund of $${amount} was approved.`,
      title: "Refund approved",
      bodyHtml: `<p>Hi ${escapeHtml(firstName(p))},</p>
        <p>Your refund of <strong>$${escapeHtml(amount)}</strong> has been approved and is being processed back to your original payment method.</p>
        ${link.html}`,
      bodyText: `Hi ${firstName(p)},\n\nYour refund of $${amount} has been approved and is being processed back to your original payment method.${link.text}`,
    });
  },

  patient_refund_rejected: (p) => {
    const amount = str(p, "AMOUNT", "0.00");
    const note = str(p, "ADMIN_NOTE");
    const link = cta(str(p, "PORTAL_URL"), "Open patient portal");
    return layout({
      preheader: `Your refund request for $${amount} was not approved.`,
      title: "Refund request update",
      bodyHtml: `<p>Hi ${escapeHtml(firstName(p))},</p>
        <p>Your refund request for <strong>$${escapeHtml(amount)}</strong> was not approved.</p>
        ${note ? `<p style="margin-top:12px;padding:12px;background:#F4F6F8;border-radius:8px;"><strong>Reason:</strong> ${escapeHtml(note)}</p>` : ""}
        ${link.html}`,
      bodyText: `Hi ${firstName(p)},\n\nYour refund request for $${amount} was not approved.${note ? `\nReason: ${note}` : ""}${link.text}`,
    });
  },

  provider_assigned: (p) => {
    const med = str(p, "MEDICINE_NAME", "a treatment");
    const order = orderShort(p);
    const link = cta(str(p, "REQUEST_URL"), "Open order");
    return layout({
      preheader: `New order assigned for ${med}.`,
      title: "New order assigned",
      bodyHtml: `<p>Hi ${escapeHtml(firstName(p))},</p>
        <p>An order${order ? ` <strong>#${escapeHtml(order)}</strong>` : ""} for <strong>${escapeHtml(med)}</strong> has been assigned to you.</p>
        ${link.html}`,
      bodyText: `Hi ${firstName(p)},\n\nAn order${order ? ` #${order}` : ""} for ${med} has been assigned to you.${link.text}`,
    });
  },

  provider_ready_for_review: (p) => {
    const med = str(p, "MEDICINE_NAME", "a treatment");
    const order = orderShort(p);
    const link = cta(str(p, "REQUEST_URL"), "Review order");
    return layout({
      preheader: `Order for ${med} is ready for clinical review.`,
      title: "Ready for clinical review",
      bodyHtml: `<p>Hi ${escapeHtml(firstName(p))},</p>
        <p>Order${order ? ` <strong>#${escapeHtml(order)}</strong>` : ""} for <strong>${escapeHtml(med)}</strong> is ready for your review.</p>
        ${link.html}`,
      bodyText: `Hi ${firstName(p)},\n\nOrder${order ? ` #${order}` : ""} for ${med} is ready for your review.${link.text}`,
    });
  },

  provider_needs_attention: (p) => {
    const med = str(p, "MEDICINE_NAME", "a treatment");
    const order = orderShort(p);
    const link = cta(str(p, "REQUEST_URL"), "Open order");
    return layout({
      preheader: `Order for ${med} needs attention (additional payment).`,
      title: "Order needs attention",
      bodyHtml: `<p>Hi ${escapeHtml(firstName(p))},</p>
        <p>Order${order ? ` <strong>#${escapeHtml(order)}</strong>` : ""} for <strong>${escapeHtml(med)}</strong> is awaiting an additional payment from the patient.</p>
        ${link.html}`,
      bodyText: `Hi ${firstName(p)},\n\nOrder${order ? ` #${order}` : ""} for ${med} is awaiting an additional payment from the patient.${link.text}`,
    });
  },
};

export function renderEmailTemplate(
  key: EmailTemplateKey,
  params: EmailParams = {},
): RenderedEmail {
  const build = builders[key];
  if (!build) throw new Error(`Unknown email template: ${key}`);
  return build(params);
}
