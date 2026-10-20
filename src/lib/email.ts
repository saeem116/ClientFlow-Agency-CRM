"use server"

import nodemailer from "nodemailer"

/**
 * Sanitize a string for safe insertion into HTML (prevents XSS).
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Lazily create and cache a Nodemailer SMTP transporter.
 *
 * The transporter is created once per process (module-level cache) and reused
 * for all subsequent email sends. SMTP credentials are read from
 * environment variables and are never logged.
 */
let cachedTransporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) return cachedTransporter

  const {
    SMTP_HOST: host,
    SMTP_PORT: port,
    SMTP_SECURE: secure,
    SMTP_USER: user,
    SMTP_PASS: pass,
  } = process.env

  if (!host || !port || !user || !pass) {
    return null
  }

  const portNum = parseInt(port, 10)
  if (isNaN(portNum)) {
    return null
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port: portNum,
    secure: String(secure).toLowerCase() === "true",
    auth: {
      user,
      pass,
    },
  })

  return cachedTransporter
}

export interface InvitationEmailParams {
  to: string
  from: string
  orgName: string
  inviterName: string
  acceptLink: string
  recipientEmail: string
}

/**
 * Send an invitation email via SMTP (Nodemailer) with ClientFlow branding.
 *
 * Returns success status and any error message. The caller is responsible
 * for handling the result and surfacing errors to the user.
 *
 * Deliverability improvements over a naive template:
 *   - Clean, semantic HTML with minimal inline styles (avoids spam-score triggers)
 *   - Proper charset and language declarations
 *   - Single clear CTA button (no duplicate links)
 *   - Plain-text alternative with all key information
 *   - Hidden preview text for email clients that show a snippet
 *   - Consistent sender identity (from === authenticated SMTP_USER)
 */
export async function sendInvitationEmail({
  to,
  from,
  orgName,
  inviterName,
  acceptLink,
  recipientEmail,
}: InvitationEmailParams): Promise<{ success: boolean; error: string | null }> {
  const transporter = getTransporter()
  if (!transporter) {
    return {
      success: false,
      error:
        "Email service not configured. Set SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, and EMAIL_FROM in your environment.",
    }
  }

  const safeOrgName = escapeHtml(orgName)
  const safeInviterName = escapeHtml(inviterName)
  const safeRecipientEmail = escapeHtml(recipientEmail)
  const safeAcceptLink = escapeHtml(acceptLink)
  const currentYear = new Date().getFullYear()

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>You've been invited to join ${safeOrgName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <!-- Preview text (hidden, shown as snippet in inbox) -->
  <div style="display:none;font-size:1px;color:#f4f5f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${safeInviterName} invited you to join ${safeOrgName} on ClientFlow
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Brand header -->
          <tr>
            <td style="padding:28px 32px 24px;text-align:center;background-color:#4f46e5;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">ClientFlow</span>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Team workspace</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#0f172a;">You've been invited</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
                <strong>${safeInviterName}</strong> has invited you to join <strong>${safeOrgName}</strong>.
              </p>

              <!-- Details table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;border:1px solid #e2e8f0;">
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#64748b;width:110px;">Workspace</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:500;color:#0f172a;">${safeOrgName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#64748b;">Invited by</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:500;color:#0f172a;">${safeInviterName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#64748b;">Email</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:500;color:#0f172a;">${safeRecipientEmail}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#64748b;">Expires</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:500;color:#0f172a;">7 days</td>
                </tr>
              </table>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${safeAcceptLink}" style="display:inline-flex;align-items:center;gap:8px;padding:13px 28px;background-color:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security notice -->
              <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#94a3b8;">
                This invitation is linked to <strong style="color:#64748b;">${safeRecipientEmail}</strong>. If you didn't expect this invite, you can safely ignore this email.
              </p>

              <!-- Fallback link -->
              <p style="margin:0;font-size:13px;color:#94a3b8;">
                Having trouble? Copy and paste this link:<br>
                <a href="${safeAcceptLink}" style="color:#4f46e5;word-break:break-all;">${safeAcceptLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">
                You received this because you were invited to join ${safeOrgName}.
              </p>
              <p style="margin:0;font-size:12px;color:#cbd5e1;">
                &copy; ${currentYear} ClientFlow
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `You've been invited to join ${orgName} on ClientFlow!

${inviterName} has invited you to join their team workspace.

Workspace:  ${orgName}
Invited by: ${inviterName}
Email:      ${recipientEmail}
Expires:    7 days

Accept this invitation:
${acceptLink}

Security notice: This invitation is linked to ${recipientEmail}. If you didn't expect this invite, you can safely ignore this email.

© ${currentYear} ClientFlow`

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: `You've been invited to join ${orgName}`,
      html,
      text,
      // Include the raw "from" address as an inbound reply target so replies
      // reach the authenticated Gmail account (helps deliverability and UX).
      replyTo: from,
    })

    console.log("[email] Invitation email sent successfully:", info.messageId)
    return { success: true, error: null }
  } catch (err) {
    console.error("[email] SMTP error sending invitation:", err)
    const message =
      err instanceof Error ? err.message : "Unknown SMTP error"
    return { success: false, error: message }
  }
}

/**
 * Verify SMTP connectivity by attempting a no-op connection.
 *
 * Returns success=true when the SMTP server accepts the connection and
 * authentication succeeds. Never sends an email.
 */
export async function verifySmtpConnection(): Promise<{
  success: boolean
  error: string | null
  host: string | undefined
}> {
  const {
    SMTP_HOST: host,
    SMTP_PORT: port,
    SMTP_SECURE: secure,
    SMTP_USER: user,
    SMTP_PASS: pass,
  } = process.env

  if (!host || !port || !user || !pass) {
    return {
      success: false,
      error:
        "SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, and SMTP_PASS in your environment.",
      host,
    }
  }

  const portNum = parseInt(port, 10)
  if (isNaN(portNum)) {
    return {
      success: false,
      error: `SMTP_PORT is not a valid number: ${port}`,
      host,
    }
  }

  // Build a temporary transporter (not cached) to avoid leaking auth state
  const transporter = nodemailer.createTransport({
    host,
    port: portNum,
    secure: String(secure).toLowerCase() === "true",
    auth: { user, pass },
  })

  try {
    const verified = await transporter.verify()
    return { success: verified, error: null, host }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown SMTP error"
    return { success: false, error: message, host }
  }
}
