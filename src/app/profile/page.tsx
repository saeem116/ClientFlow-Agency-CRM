import { ensureDb } from "@/lib/database"
import { getSession, getOrganization } from "@/lib/auth"
import { ProfilePage } from "./profile-page"

export default async function ProfilePageServer() {
  await ensureDb()
  const session = await getSession()
  const org = session ? await getOrganization() : null

  if (!session) {
    // SSR will redirect client-side via LayoutWrapper, but keep this safe.
    return <ProfilePage user={null} org={null} isDemo={false} />
  }

  return (
    <ProfilePage
      user={{
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        avatar: session.user.avatar,
        role: session.user.role,
        organizationRole: session.user.organizationRole,
        phone: session.user.phone,
      }}
      org={org}
      isDemo={session.isDemo}
    />
  )
}
