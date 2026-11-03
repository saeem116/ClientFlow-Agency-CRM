/**
 * Provision a demo admin account in the isolated demo database.
 *
 * This script is SAFE and IDEMPOTENT:
 * - Only runs against a database named exactly "clientflow_demo"
 * - Uses DEMO_MONGODB_URI or DEMO_PROVISION_MONGODB_URI from environment
 * - Requires explicit CONFIRM_DEMO_PROVISION=YES to execute
 * - Creates/updates an admin user with ADMIN role in the demo organization
 * - Generates a secure random password at runtime (never hardcoded)
 * - Prints the credentials to console for Vercel configuration
 *
 * Usage:
 *   CONFIRM_DEMO_PROVISION=YES \
 *   DEMO_PROVISION_MONGODB_URI="mongodb+srv://<user>:<pass>@host/clientflow_demo" \
 *   DEMO_ADMIN_EMAIL="admin@demo.test" \
 *   node scripts/provision-demo-admin.js
 *
 * The DEMO_ADMIN_EMAIL defaults to "admin@demo.test" if not provided.
 * The password is generated at runtime and printed to stdout.
 * Configure DEMO_ADMIN_EMAIL in Vercel to match the email used here.
 */

import mongoose from "mongoose"
import { randomBytes } from "crypto"
import bcrypt from "bcryptjs"
import {
  validateSeedUri,
  hashPassword,
  findOrCreateUser,
  findOrCreateOrganization,
} from "../src/lib/seed/shared.ts"

async function main() {
  // ─── Safety: explicit confirmation ──────────────────────────────────────────
  const confirm = process.env.CONFIRM_DEMO_PROVISION
  if (confirm !== "YES") {
    console.error("❌ ERROR: CONFIRM_DEMO_PROVISION must be set to YES to run this script.")
    console.error("   This is an explicit opt-in guard to prevent accidental database writes.")
    console.error("   Example:")
    console.error('   CONFIRM_DEMO_PROVISION=YES DEMO_PROVISION_MONGODB_URI="..." DEMO_ADMIN_EMAIL="admin@demo.test" node scripts/provision-demo-admin.js')
    process.exit(1)
  }

  // ─── Get and validate database URI ──────────────────────────────────────────
  // Prefer explicit provisioning URI, fall back to the app's demo URI
  const provisionUri = process.env.DEMO_PROVISION_MONGODB_URI || process.env.DEMO_MONGODB_URI
  if (!provisionUri) {
    console.error("❌ ERROR: DEMO_PROVISION_MONGODB_URI (or DEMO_MONGODB_URI) is not set.")
    console.error("   This script refuses to run without an explicit demo database URI.")
    process.exit(1)
  }

  // Validate URI scheme and database name
  const validation = validateSeedUri(provisionUri, { requiredDbName: "clientflow_demo" })
  if (!validation.ok) {
    console.error(`❌ ERROR: ${validation.error}`)
    console.error("   This safeguard prevents accidental writes against the wrong database.")
    process.exit(1)
  }

  // ─── Admin email configuration ──────────────────────────────────────────────
  const adminEmail = (process.env.DEMO_ADMIN_EMAIL || "admin@demo.test").trim().toLowerCase()
  if (!adminEmail || !adminEmail.includes("@")) {
    console.error("❌ ERROR: DEMO_ADMIN_EMAIL must be a valid email address.")
    process.exit(1)
  }
  console.log(`📧 Provisioning admin demo account: ${adminEmail}`)

  // ─── Connect to demo database ───────────────────────────────────────────────
  console.log("🔌 Connecting to demo database...")
  await mongoose.connect(provisionUri)

  // Verify connected database name matches expectation
  const connectedDbName = mongoose.connection.db?.databaseName
  if (connectedDbName !== "clientflow_demo") {
    console.error(`❌ ERROR: Connected database is '${connectedDbName}', expected 'clientflow_demo'.`)
    await mongoose.disconnect()
    process.exit(1)
  }
  console.log(`✅ Connected and verified database: ${connectedDbName}`)

  // ─── Import models ──────────────────────────────────────────────────────────
  const { User } = await import("../src/lib/mongoose/user.ts")
  const { Organization } = await import("../src/lib/mongoose/organization.ts")
  const { Membership } = await import("../src/lib/mongoose/membership.ts")

  // ─── Find or create the demo organization ───────────────────────────────────
  // Use the same organization name/slug as the public seed for consistency
  const org = await findOrCreateOrganization(Organization, "ClientFlow Demo Agency", "clientflow-demo")
  console.log(`📁 Organization: ${org.name} (${org._id})`)

  // ─── Generate a secure random password at runtime ───────────────────────────
  const passwordBytes = randomBytes(16)
  const plainPassword = `demo-admin-${passwordBytes.toString("hex")}`
  const hashedPassword = await hashPassword(plainPassword)

  // ─── Find or create the admin user ──────────────────────────────────────────
  const admin = await findOrCreateUser(User, {
    email: adminEmail,
    name: "Demo Admin",
    role: "ADMIN",
    passwordHash: hashedPassword,
  })
  console.log(`👤 Admin user: ${admin.email} (${admin._id})`)

  // ─── Ensure admin membership with ADMIN role ────────────────────────────────
  const existingMembership = await Membership.findOne({
    userId: admin._id,
    organizationId: org._id,
  }).lean()

  if (existingMembership) {
    if (existingMembership.role !== "ADMIN") {
      await Membership.updateOne(
        { _id: existingMembership._id },
        { $set: { role: "ADMIN" } }
      )
      console.log("🔧 Updated existing membership to ADMIN role.")
    } else {
      console.log("✅ Admin membership already exists with ADMIN role.")
    }
  } else {
    await Membership.create({
      userId: admin._id,
      organizationId: org._id,
      role: "ADMIN",
    })
    console.log("✅ Created admin membership with ADMIN role.")
  }

  // ─── Verify the account can authenticate ────────────────────────────────────
  const verifyUser = await User.findOne({ email: adminEmail }).select("+password").lean()
  if (!verifyUser) {
    console.error("❌ ERROR: Failed to verify admin user after creation.")
    await mongoose.disconnect()
    process.exit(1)
  }

  const isValidPassword = await bcrypt.compare(plainPassword, verifyUser.password)
  if (!isValidPassword) {
    console.error("❌ ERROR: Password verification failed after creation.")
    await mongoose.disconnect()
    process.exit(1)
  }
  console.log("✅ Password verification successful.")

  // ─── Output credentials for Vercel configuration ────────────────────────────
  console.log("")
  console.log("═══════════════════════════════════════════════════════════════")
  console.log("✅ DEMO ADMIN ACCOUNT PROVISIONED SUCCESSFULLY")
  console.log("═══════════════════════════════════════════════════════════════")
  console.log("")
  console.log("   Configure these in Vercel Project Settings → Environment Variables:")
  console.log("")
  console.log(`   DEMO_ADMIN_EMAIL="${adminEmail}"`)
  console.log(`   DEMO_ADMIN_PASSWORD="${plainPassword}"`)
  console.log("")
  console.log("   The demo database connection (DEMO_MONGODB_URI) should already")
  console.log("   be configured and pointing to the 'clientflow_demo' database.")
  console.log("")
  console.log("   The reviewer account (reviewer@clientflow.test) is UNCHANGED")
  console.log("   and retains its MEMBER role with read-only access.")
  console.log("═══════════════════════════════════════════════════════════════")
  console.log("")

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error("❌ Provisioning failed:", err)
  process.exit(1)
})