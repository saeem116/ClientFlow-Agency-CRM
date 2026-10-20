/**
 * Safe SMTP connectivity check.
 *
 * Usage:
 *   node scripts/verify-smtp.mjs
 *
 * Reads SMTP_* variables from the environment (e.g. .env.local loaded by the
 * caller) and attempts a Nodemailer `verify()` — no email is sent.
 *
 * Exits 0 on success, 1 on failure.
 */
import nodemailer from "nodemailer"

const {
  SMTP_HOST: host,
  SMTP_PORT: port,
  SMTP_SECURE: secure,
  SMTP_USER: user,
  SMTP_PASS: pass,
} = process.env

if (!host || !port || !user || !pass) {
  console.error("FAIL: SMTP not configured.")
  console.error(
    "Set SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, and SMTP_PASS in your environment."
  )
  process.exit(1)
}

const portNum = parseInt(port, 10)
if (isNaN(portNum)) {
  console.error(`FAIL: SMTP_PORT is not a valid number: ${port}`)
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host,
  port: portNum,
  secure: String(secure).toLowerCase() === "true",
  auth: { user, pass },
})

try {
  const verified = await transporter.verify()
  if (verified) {
    console.log(`OK: SMTP connection to ${host}:${portNum} verified.`)
    process.exit(0)
  }
  console.error("FAIL: SMTP verification returned false.")
  process.exit(1)
} catch (err) {
  console.error(`FAIL: SMTP verification failed for ${host}.`)
  console.error(`Reason: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
}