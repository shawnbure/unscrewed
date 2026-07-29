import type { Env } from "../env.js";

const FROM = "notifications@unscrewed.lol";

type OrganizerLeadInput = {
  requestId: string;
  name: string;
  email: string;
  message: string;
  attribution?: {
    source: string;
    medium: string;
    campaign: string;
  };
};

type PressLeadInput = OrganizerLeadInput;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]!
  );
}

function compact(value: string, maxLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function attributionLine(input: OrganizerLeadInput): string {
  if (!input.attribution) return "Attribution: direct or unavailable";
  return `Attribution: ${compact(input.attribution.source, 80)} / ${compact(input.attribution.medium, 80)} / ${compact(input.attribution.campaign, 120)}`;
}

/**
 * Best-effort operator alert for a genuine organizer intake. The support
 * record is authoritative; email availability must never affect submission.
 */
export async function notifyOrganizerLead(
  env: Env,
  input: OrganizerLeadInput
): Promise<void> {
  const name = compact(input.name, 100) || "Organizer";
  const replyEmail = input.email.replace(/[\r\n]/g, "").trim();
  const reviewUrl = `${env.PUBLIC_BASE_URL}/admin/support`;

  await env.EMAIL.send({
    to: env.OPERATOR_EMAIL,
    from: { email: FROM, name: "unscrewed" },
    subject: `New organizer pilot request: ${name}`,
    text: `A person submitted the organizer pilot form.

Name: ${name}
Reply email: ${replyEmail}
Reference: ${input.requestId}
${attributionLine(input)}

${input.message}

Review the private support inbox:
${reviewUrl}`,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f7f5ef;color:#25231f;font-family:Arial,sans-serif">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px">
      <p style="font-size:13px;font-weight:700;letter-spacing:.08em;color:#5a6f3b">UNSCREWED ORGANIZER INTAKE</p>
      <h1 style="font-size:24px;line-height:1.25;margin:16px 0 8px">A person offered to run a pilot</h1>
      <p style="font-size:15px;line-height:1.6"><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Reply email:</strong> ${escapeHtml(replyEmail)}<br><strong>Reference:</strong> ${escapeHtml(input.requestId)}<br><strong>${escapeHtml(attributionLine(input))}</strong></p>
      <div style="white-space:pre-wrap;background:#fff;border:1px solid #dedbd3;border-radius:12px;padding:16px;font-size:15px;line-height:1.55">${escapeHtml(input.message)}</div>
      <p style="margin:28px 0">
        <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:#455d2a;color:#fff;text-decoration:none;border-radius:10px;padding:13px 18px;font-weight:700">Review private request</a>
      </p>
      <p style="font-size:12px;line-height:1.5;color:#68645c">This is an operator alert for a private form submission, not a marketing email.</p>
    </div>
  </body>
</html>`,
    headers: {
      "Reply-To": replyEmail,
    },
  });
}

/**
 * Best-effort operator alert for a publication inquiry. The private support
 * record remains authoritative if email delivery is delayed or unavailable.
 */
export async function notifyPressLead(
  env: Env,
  input: PressLeadInput
): Promise<void> {
  const name = compact(input.name, 100) || "Press contact";
  const replyEmail = input.email.replace(/[\r\n]/g, "").trim();
  const reviewUrl = `${env.PUBLIC_BASE_URL}/admin/support`;

  await env.EMAIL.send({
    to: env.OPERATOR_EMAIL,
    from: { email: FROM, name: "unscrewed" },
    subject: `New press inquiry: ${name}`,
    text: `A person submitted the press and publication inquiry form.

Name: ${name}
Reply email: ${replyEmail}
Reference: ${input.requestId}
${attributionLine(input)}

${input.message}

Review the private support inbox:
${reviewUrl}`,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f7f5ef;color:#25231f;font-family:Arial,sans-serif">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px">
      <p style="font-size:13px;font-weight:700;letter-spacing:.08em;color:#5a6f3b">UNSCREWED PRESS INQUIRY</p>
      <h1 style="font-size:24px;line-height:1.25;margin:16px 0 8px">A publication contact requested information</h1>
      <p style="font-size:15px;line-height:1.6"><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Reply email:</strong> ${escapeHtml(replyEmail)}<br><strong>Reference:</strong> ${escapeHtml(input.requestId)}<br><strong>${escapeHtml(attributionLine(input))}</strong></p>
      <div style="white-space:pre-wrap;background:#fff;border:1px solid #dedbd3;border-radius:12px;padding:16px;font-size:15px;line-height:1.55">${escapeHtml(input.message)}</div>
      <p style="margin:28px 0">
        <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:#455d2a;color:#fff;text-decoration:none;border-radius:10px;padding:13px 18px;font-weight:700">Review private inquiry</a>
      </p>
      <p style="font-size:12px;line-height:1.5;color:#68645c">This is an operator alert for a private form submission, not a marketing email.</p>
    </div>
  </body>
</html>`,
    headers: {
      "Reply-To": replyEmail,
    },
  });
}
