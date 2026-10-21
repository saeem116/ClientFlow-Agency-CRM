/**
 * Guarded demo reviewer password-reset script.
 *
 * Resets the password for the shared demo account (reviewer@clientflow.test)
 * in the demo database ONLY. Refuses to run against production.
 *
 * Target email is hardcoded — DEMO_ACCOUNT_EMAIL, if set, must match it
 * or the script refuses to proceed. This prevents accidental writes against
 * the wrong account when the env var is misconfigured.
 *
 * Usage:
 *   CONFIRM_DEMO_RESET=YES \
 *   DEMO_RESET_MONGODB_URI="mongodb+srv://<user>:<pass>@host/clientflow_demo" \
 *   DEMO_RESET_PASSWORD="NewPassword!2026" \
 *   node scripts/reset-demo-password.js
 */
import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import {
  parseDatabaseName,
  validateMongoScheme,
  TARGET_EMAIL,
  validateTargetEmail,
} from "../src/lib/reset-demo-password.utils.ts"

async function main() {
  const confirm = process.env.CONFIRM_DEMO_RESET
  if (confirm !== "YES") {
    console.error("❌ ERROR: CONFIRM_DEMO_RESET must be set to YES to run this script.")
    console.error("   This is an explicit opt-in guard to prevent accidental writes.")
    process.exit(1)
  }

  const resetUri = process.env.DEMO_RESET_MONGODB_URI
  if (!resetUri) {
    console.error("❌ ERROR: DEMO_RESET_MONGODB_URI is not set.")
    process.exit(1)
  }

  // Validate scheme
  if (!validateMongoScheme(resetUri)) {
    console.error("❌ ERROR: DEMO_RESET_MONGODB_URI must use mongodb:// or mongodb+srv:// scheme.")
    process.exit(1)
  }

  // Validate database name — must be exactly clientflow_demo
  const dbName = parseDatabaseName(resetUri)
  if (!dbName) {
    console.error("❌ ERROR: Could not parse database name from DEMO_RESET_MONGODB_URI.")
    process.exit(1)
  }
  if (dbName !== "clientflow_demo") {
    console.error("❌ ERROR: Database name must be exactly 'clientflow_demo'.")
    console.error("   Refusing to run against any other database.")
    process.exit(1)
  }

  const newPassword = process.env.DEMO_RESET_PASSWORD
  if (!newPassword || newPassword.length < 8) {
    console.error("❌ ERROR: DEMO_RESET_PASSWORD must be set and at least 8 characters.")
    process.exit(1)
  }

  // Target email is locked to reviewer@clientflow.test.
  // If DEMO_ACCOUNT_EMAIL is set, it must agree — otherwise refuse.
  const emailValidation = validateTargetEmail()
  if (!emailValidation.ok) {
    console.error("❌ ERROR:", emailValidation.error)
    process.exit(1)
  }

  await mongoose.connect(resetUri)

  try {
    // Verify the connected database name matches what we expect.
    const connectedDbName = mongoose.connection.db?.databaseName
    if (connectedDbName !== "clientflow_demo") {
      console.error(`❌ ERROR: Connected database is '${connectedDbName}', expected 'clientflow_demo'.`)
      process.exit(1)
    }

    console.log("🔌 Connected and verified database:", connectedDbName)

    // Import the User model (uses the default mongoose instance, now connected
    // to the demo DB).
    const { User } = await import("../src/lib/mongoose/user.ts")

    const hashed = await bcrypt.hash(newPassword, 12)

    const result = await User.updateOne(
      { email: TARGET_EMAIL.toLowerCase().trim() },
      { password: hashed }
    )

    if (result.matchedCount !== 1) {
      console.error("❌ No user found with email reviewer@clientflow.test in the demo database.")
      console.error("   Run the seed script first:")
      console.error("   CONFIRM_DEMO_SEED=YES DEMO_SEED_MONGODB_URI=... DEMO_REVIEWER_PASSWORD=... node scripts/seed-demo-public.js")
      process.exit(1)
    }

    if (result.modifiedCount === 0) {
      console.log("⚠️  Password was already the same — no change made.")
    } else {
      console.log("✅ Password reset for demo reviewer account.")
    }
  } finally {
    await mongoose.disconnect()
    console.log("Disconnected.")
  }
}

main().catch((err) => {
  console.error("Reset failed:", err)
  process.exit(1)
})
