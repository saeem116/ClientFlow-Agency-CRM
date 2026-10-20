import { ensureDb } from "@/lib/database"
import { User, Organization, Membership } from "@/lib/database"

// Clean seed function for initial user data
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

    // Create the first user (will be the registered user)
    const user = await User.create({
      email: "user@example.com",
      name: "Registered User",
      role: "ADMIN",
      password: "$2a$12$LQv3c1yqBWVHxkd6fqYD/xHhLuN6LhPuSFej7E9/YuYS5YQ7.9Zx6",
    })

    // Create membership
    await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: "ADMIN",
    })

    console.log(`Created clean organization and user setup: Org ID ${org._id.toString()}, User ID ${user._id.toString()}`)
    return { success: true, message: "Created clean initial setup" }

  } catch (error) {
    console.error("Error in seedData:", error)
    return { success: false, error: String(error) }
  }
}
