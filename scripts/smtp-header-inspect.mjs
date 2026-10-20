/**
 * SMTP Deliverability Diagnostic Tool
 *
 * Usage:
 *   node scripts/smtp-header-inspect.mjs [--send-test]
 *
 * Without --send-test: validates configuration and checks DNS records for
 * the FROM domain (SPF, DKIM, DMARC) when available.
 *
 * With --send-test: sends a real invitation email and reports the SMTP
 * response headers so you can inspect SPF/DKIM/DMARC results in your
 * inbox.
 *
 * This script NEVER exposes or logs SMTP credentials.
 */
import dns from "dns"
import { promisify } from "util"
import nodemailer from "nodemailer"

const resolveTxt = promisify(dns.resolveTxt)

const {
  SMTP_HOST: host,
  SMTP_PORT: port,
  SMTP_SECURE: secure,
  SMTP_USER: user,
  SMTP_PASS: pass,
  EMAIL_FROM: emailFrom,
  NEXT_PUBLIC_APP_URL: appUrl,
} = process.env

console.log("═".repeat(60))
console.log("  ClientFlow Email Deliverability Diagnostic")
console.log("═".repeat(60))
console.log("")

// --- 1. Configuration validation ---
console.log("┌─ Configuration ──────────────────────────────────────┐")
console.log(`│  SMTP_HOST:   ${host ?? "(not set)"}  │`)
console.log(`│  SMTP_PORT:   ${port ?? "(not set)"}  │`)
console.log(`│  SMTP_SECURE: ${secure ?? "(not set)"}  │`)
console.log(`│  SMTP_USER:   ${user ? user.replace(/(.{4}).*/, "$1***") : "(not set)"}  │`)
console.log(`│  SMTP_PASS:   ${pass ? "set" : "(not set)"}  │`)
console.log(`│  EMAIL_FROM:  ${emailFrom ?? "(not set)"}  │`)
console.log(`│  APP_URL:     ${appUrl ?? "(not set)"}  │`)
console.log("└──────────────────────────────────────────────────────┘")
console.log("")

// Check critical config
const missing = []
if (!host) missing.push("SMTP_HOST")
if (!port) missing.push("SMTP_PORT")
if (!user) missing.push("SMTP_USER")
if (!pass) missing.push("SMTP_PASS")
if (!emailFrom) missing.push("EMAIL_FROM")

if (missing.length > 0) {
  console.error("✗ Missing required env vars:", missing.join(", "))
  process.exit(1)
}

// Parse from address
const fromMatch = emailFrom.match(/^(.+?)\s*<([^>]+)>$/i)
const fromDisplayName = fromMatch ? fromMatch[1].trim() : "ClientFlow"
const fromEmailAddress = fromMatch ? fromMatch[2].trim() : emailFrom

console.log(`┌─ From Address ───────────────────────────────────────┐`)
console.log(`│  Display Name: ${fromDisplayName.padEnd(36)} │`)
console.log(`│  Email:        ${fromEmailAddress.padEnd(36)} │`)
console.log(`└──────────────────────────────────────────────────────┘`)
console.log("")

// --- 2. Sender domain analysis ---
const senderDomain = fromEmailAddress.includes("@")
  ? fromEmailAddress.split("@")[1]
  : null

if (senderDomain) {
  console.log("┌─ Sender Domain Analysis ────────────────────────────┐")
  console.log(`│  Domain: ${senderDomain}`)

  if (senderDomain === "gmail.com" || senderDomain === "googlemail.com") {
    console.log("│  ⚠ Gmail address — SPF/DKIM/DMARC controlled by Google")
    console.log("│    You cannot configure DNS for @gmail.com. Deliverability")
    console.log("│    depends on your Google account reputation and App Password usage.")
    console.log("└──────────────────────────────────────────────────────┘")
  } else {
    console.log("│  ℹ Custom domain — check these DNS records:")
    console.log("│    - SPF:  _spf.google.com (for Gmail) or your MTAs")
    console.log("│    - DKIM: selector._domainkey (your provider)")
    console.log("│    - DMARC: _dmarc (e.g. v=DMARC1; p=none;)")
    console.log("└──────────────────────────────────────────────────────┘")
  }
  console.log("")
}

// --- 3. URL analysis ---
console.log("┌─ Invitation URL ────────────────────────────────────┐")
const url = appUrl || "http://localhost:3000"
console.log(`│  NEXT_PUBLIC_APP_URL: ${url}`)

const testToken = "test-token-abc123"
const testLink = `${url}/accept-invitation?token=${testToken}`
console.log(`│  Test link: ${testLink}`)

if (url.includes("localhost") || url.includes("127.0.0.1")) {
  console.log("│  ⚠ Uses localhost — only valid for local testing")
  console.log("│    Set NEXT_PUBLIC_APP_URL to your production domain")
  console.log("│    before deploying (e.g. https://your-domain.com)")
} else {
  console.log("│  ✓ Production-ready URL")
}
console.log("└──────────────────────────────────────────────────────┘")
console.log("")

// --- 4. SMTP connectivity test ---
console.log("┌─ SMTP Connectivity ─────────────────────────────────┐")
try {
  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: String(secure).toLowerCase() === "true",
    auth: { user, pass },
  })

  const verified = await transporter.verify()
  console.log(`│  ✓ Connected to ${host}:${port}`)
  console.log(`│  ✓ Authentication successful`)
  console.log(`│  ✓ Verified: ${verified}`)
  console.log("└──────────────────────────────────────────────────────┘")
} catch (err) {
  console.log(`│  ✗ SMTP connection failed:`)
  console.log(`│    ${err.message}`)
  console.log("└──────────────────────────────────────────────────────┘")
  process.exit(1)
}
console.log("")

// --- 5. Send test email (optional) ---
if (process.argv.includes("--send-test")) {
  const testTo = user // Send to the authenticated account itself
  const testSubject = "[TEST] ClientFlow Invitation"

  console.log("┌─ Sending Test Email ────────────────────────────────┐")
  console.log(`│  To:      ${testTo}`)
  console.log(`│  Subject: ${testSubject}`)
  console.log("└──────────────────────────────────────────────────────┘")
  console.log("")

  try {
    const info = await transporter.sendMail({
      from: emailFrom,
      to: testTo,
      subject: testSubject,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Test</title></head>
<body style="font-family:sans-serif;padding:20px;">
  <h2>ClientFlow Deliverability Test</h2>
  <p>If you receive this email, SMTP is working.</p>
  <p><strong>Next steps:</strong></p>
  <ol>
    <li>Check which folder the email landed in (Inbox vs Spam)</li>
    <li>View email headers to see SPF/DKIM/DMARC results</li>
    <li>Search for "Authentication-Results" in headers</li>
  </ol>
  <hr>
  <p style="font-size:12px;color:#888;">Sent from ${host} at ${new Date().toISOString()}</p>
</body>
</html>`,
      text: `ClientFlow Deliverability Test\n\nIf you receive this email, SMTP is working.\n\nNext steps:\n1. Check which folder the email landed in (Inbox vs Spam)\n2. View email headers to see SPF/DKIM/DMARC results\n3. Search for "Authentication-Results" in headers\n\nSent from ${host} at ${new Date().toISOString()}`,
    })

    console.log("┌─ SMTP Response ─────────────────────────────────────┐")
    console.log(`│  Message ID: ${info.messageId}`)
    console.log(`│  Envelope:   ${JSON.stringify(info.envelope)}`)
    console.log(`│  Accepted:   ${info.rejected.length === 0 && info.accepted.length > 0 ? "Yes" : "No"}`)
    console.log("└──────────────────────────────────────────────────────┘")
    console.log("")
    console.log("✓ Test email sent! Check your inbox (and spam folder).")
    console.log("")
    console.log("To inspect headers in Gmail:")
    console.log("  1. Open the test email")
    console.log("  2. Click 'Show original' (three-dot menu)")
    console.log("  3. Search for 'Authentication-Results'")
    console.log("  4. Look for SPF, DKIM, and DMARC results")
  } catch (err) {
    console.log("┌─ Send Failed ───────────────────────────────────────┐")
    console.log(`│  ${err.message}`)
    console.log("└──────────────────────────────────────────────────────┘")
    process.exit(1)
  }
} else {
  console.log("┌─ Optional: Send Test Email ─────────────────────────┐")
  console.log("│  Run with: node scripts/smtp-header-inspect.mjs --send-test")
  console.log("│  This will send a test email and show SMTP headers.")
  console.log("└──────────────────────────────────────────────────────┘")
  console.log("")
}

// --- 6. Deliverability recommendations ---
console.log("┌─ Deliverability Recommendations ────────────────────┐")
console.log("│                                                   │")
if (senderDomain === "gmail.com" || senderDomain === "googlemail.com") {
  console.log("│  Gmail Account Specific:                          │")
  console.log("│  • Ensure App Password is used (not regular pw)  │")
  console.log("│  • Check Gmail sending limits (500/day for new   │")
  console.log("│    accounts, 2000/day for verified accounts)     │")
  console.log("│  • Gmail applies its own spam filtering          │")
  console.log("│  • Consider Google Workspace for better control  │")
  console.log("│                                                   │")
}
console.log("│  General Best Practices:                         │")
console.log("│  • Always include plain-text alternative        │")
console.log("│  • Keep HTML simple, semantic, inline styles     │")
console.log("│  • Use a recognizable 'From' display name        │")
console.log("│  • Avoid spam trigger words in subject lines     │")
console.log("│  • Test with Gmail, Outlook, Apple Mail           │")
console.log("│  • Monitor bounce rates and spam complaints      │")
console.log("│                                                   │")
console.log("│  DNS Checks (for custom domains only):          │")
console.log("│  • SPF: v=spf1 include:_spf.google.com ~all     │")
console.log("│  • DKIM: selector._domainkey with public key     │")
console.log("│  • DMARC: v=DMARC1; p=none; rua=mailto:...       │")
console.log("└──────────────────────────────────────────────────────┘")
console.log("")
