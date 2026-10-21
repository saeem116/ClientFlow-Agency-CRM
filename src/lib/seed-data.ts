import { ensureDb } from "@/lib/database"
import { User, Organization, Membership } from "@/lib/database"

/**
 * Clean seed function for initial user data.
 *
 * Safety: this only runs when the database is completely empty (no users at
 * all). It never overwrites or deletes existing records. The password is
 * generated at runtime so no bcrypt hash is committed to source control.
 */
export async function seedData() {
  try {
    await ensureDb()
    // Check if there's already a user with real registration
    const existingUser = await User.findOne().lean()

    if (existingUser) {
      console.log("Found existing user, skipping demo data seeding")
      return { success: true, message: "No demo data created - existing user found" }
    }

    console.log("No existing data found, creating clean initial setup")

    // Create main organization for the first registered user
    const org = await Organization.create({
      name: "My Workspace",
      slug: "my-workspace",
    })

    // Generate a random password at runtime — never commit a bcrypt hash.
    const { hashPassword } = await import("./bcrypt")
    const randomPassword = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const hashedPassword = await hashPassword(randomPassword)

    const user = await User.create({
      email: "user@example.com",
      name: "Registered User",
      role: "ADMIN",
      password: hashedPassword,
    })

    // Create membership
    await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: "ADMIN",
    })

    console.log(`Created clean organization and user setup: Org ID ${org._id.toString()}, User ID ${user._id.toString()}`)
    console.log(`Demo login: user@example.com / ${randomPassword}`)
    return { success: true, message: "Created clean initial setup" }

  } catch (error) {
    console.error("Error in seedData:", error)
    return { success: false, error: String(error) }
  }
}