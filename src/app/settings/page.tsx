import { ensureDb } from "@/lib/database"
import { Membership, Organization } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SettingsPageClient } from "./settings-page-client"

function memberAvatarUrl(avatarId: string | null | undefined, userId: string): string | null {
  if (!avatarId) return null
  if (typeof avatarId === "string" && avatarId.startsWith("http")) return avatarId
  return `/api/avatars/${userId}`
}

export default async function SettingsPage() {
  await ensureDb()
  const org = await getOrganization()

  if (!org) {
    redirect("/sign-in")
  }

  // Fetch organization details with memberships
  const organization = await Organization.findOne({ _id: org.id }).lean()

  const memberships = await Membership.find({ organizationId: org.id })
    .populate("userId", "name email avatar")
    .populate("organizationId", "name slug")
    .lean()
    .exec()

  return (
    <SettingsPageClient
      org={{
        id: organization?._id?.toString() || org.id,
        name: organization?.name || org.name,
        slug: organization?.slug || org.slug,
        memberships: memberships.map((m: any) => ({
          id: m._id?.toString() || "",
          role: m.role,
          user: {
            name: m.userId?.name || "Unknown",
            email: m.userId?.email || "",
            avatar: memberAvatarUrl(m.userId?.avatar, m.userId?._id?.toString() || ""),
          },
        })),
      }}
    />
  )
}