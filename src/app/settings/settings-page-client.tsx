"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { UserPlus, Mail, Settings, Bell, Palette, X, Check, AlertCircle, User, Save, Camera, Trash2, Loader2 } from "lucide-react"
import { useTheme } from "@/components/providers/theme-provider"
import { useAuth } from "@/lib/auth-context"

interface SettingsPageClientProps {
  org: {
    id: string
    name: string
    slug: string
    memberships?: Array<{
      id: string
      role: string
      user: { name: string | null; email: string; avatar?: string | null }
    }>
  } | null
}

export function SettingsPageClient({ org }: SettingsPageClientProps) {
  const [activeTab, setActiveTab] = useState("general")
  const { theme, setTheme, resolvedTheme, density, setDensity } = useTheme()
  const { user, refresh } = useAuth()

  // Invite member state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("MEMBER")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteError, setInviteError] = useState("")

  // Profile edit state
  const [profileName, setProfileName] = useState(user?.name || "")
  const [profileAvatar, setProfileAvatar] = useState<string>(user?.avatar ?? "")
  // Staged values — committed only on Save Changes.
  // pendingAvatar holds the raw GridFS file ID for the PATCH body.
  // pendingAvatarUrl is the display URL used by <Avatar> and the text input.
  // pendingAvatarRemoval takes precedence when true.
  const [pendingAvatar, setPendingAvatar] = useState(user?.avatar || "")
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState(user?.avatar || "")
  const [pendingAvatarRemoval, setPendingAvatarRemoval] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarSuccess, setAvatarSuccess] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  // Holds a temporary object URL for the in-progress upload preview.
  // Revoked once the server confirms success or on unmount/error.
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Revoke the temporary preview URL when the component unmounts to avoid memory leaks.
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const handleProfileSave = async () => {
    setProfileError("")
    setProfileSuccess(false)
    setProfileSaving(true)
    try {
      // Build the body: only include avatar if the user changed it.
      // We compare against the server's current value (user?.avatar) to detect real changes.
      const hadAvatarBefore = !!user?.avatar
      const hasAvatarNow = pendingAvatarRemoval ? false : !!pendingAvatar
      const avatarChanged = hadAvatarBefore !== hasAvatarNow || (pendingAvatar && pendingAvatar !== user?.avatar)

      const body: Record<string, unknown> = { name: profileName }
      if (avatarChanged) {
        // pendingAvatarRemoval means DELETE the avatar (send explicit null);
        // otherwise send the staged value. Never strip the field — the server
        // needs the explicit null to clear the avatar.
        body.avatar = pendingAvatarRemoval ? null : pendingAvatar || null
      }

      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      })
      const data = await response.json()
      if (!response.ok) {
        setProfileError(data.error || "Failed to save profile")
        return
      }
      // On success, commit staged values into profileAvatar so subsequent
      // navigations reflect the new state without another round-trip.
      await refresh()
      setProfileAvatar(user?.avatar || "")
      setPendingAvatarUrl(user?.avatar || "")
      setPendingAvatarRemoval(false)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch {
      setProfileError("An error occurred. Please try again.")
    } finally {
      setProfileSaving(false)
    }
  }

  const handleAvatarUpload = async (file: File) => {
    setAvatarError(null)
    setAvatarSuccess(false)
    setAvatarUploading(true)
    // Create an immediate local preview so the user sees their image right away.
    const objectUrl = URL.createObjectURL(file)
    setAvatarPreview(objectUrl)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const response = await fetch("/api/files/avatar", {
        method: "POST",
        body: formData,
        credentials: "include",
      })
      const data = await response.json()
      if (!response.ok) {
        // Server rejected — revert preview
        URL.revokeObjectURL(objectUrl)
        setAvatarPreview(null)
        setAvatarError(data.error || "Upload failed")
        return
      }
      // Server accepted — refresh the auth context so the header and other
      // components pick up the new avatar, then sync local state from the
      // upload response (NOT from user?.avatar, which is stale until React
      // re-renders — relying on it makes the Save skip the avatar).
      await refresh()
      URL.revokeObjectURL(objectUrl)
      setAvatarPreview(null)
      // pendingAvatar holds the RAW GridFS file ID — the PATCH /api/auth/profile
      // endpoint expects the file ID, not a URL. pendingAvatarUrl holds the
      // display URL for the Avatar component. profileAvatar is the committed
      // value used after Save Changes.
      const newAvatarUrl = user?.id ? `/api/avatars/${user.id}` : ""
      setProfileAvatar(newAvatarUrl)
      setPendingAvatar(data.avatarId)
      setPendingAvatarUrl(newAvatarUrl)
      setAvatarSuccess(true)
      setTimeout(() => setAvatarSuccess(false), 3000)
    } catch {
      URL.revokeObjectURL(objectUrl)
      setAvatarPreview(null)
      setAvatarError("Failed to upload avatar. Please try again.")
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleAvatarRemove = () => {
    // Stage removal — the actual DELETE only fires when the user clicks Save.
    // This lets Cancel restore the avatar, and Remove-then-Replace works too.
    setPendingAvatarRemoval(true)
    setAvatarPreview(null) // clear any in-progress preview
    setPendingAvatar("") // clear staged value so Save sends null
  }

  if (!org) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-[var(--foreground)]">Settings</h1>
          <p className="text-slate-500 dark:text-[var(--muted-foreground)] mt-1">Configure your organization and preferences</p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500 dark:text-[var(--muted-foreground)]">No organization found. Please contact support.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleInvite = async () => {
    setInviteError("")
    setInviteSuccess(false)

    // Validation
    if (!inviteEmail || !inviteEmail.includes("@")) {
      setInviteError("Please enter a valid email address")
      return
    }

    setInviteLoading(true)

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        setInviteError(data.error || "Failed to send invitation")
        setInviteLoading(false)
        return
      }

      setInviteLoading(false)
      setInviteSuccess(true)
      setInviteEmail("")

      // Close after 2 seconds
      setTimeout(() => {
        setInviteSuccess(false)
        setInviteOpen(false)
      }, 2000)
    } catch (err) {
      console.error("Invite error:", err)
      setInviteError("Failed to send invitation. Please try again.")
      setInviteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-[var(--foreground)]">Settings</h1>
        <p className="text-slate-500 dark:text-[var(--muted-foreground)] mt-1">Configure your organization and preferences</p>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-1 border-b border-slate-200 dark:border-[var(--border)] overflow-x-auto whitespace-nowrap">
            {[
              { id: "general", label: "General", icon: <Settings className="h-4 w-4" /> },
              { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
              { id: "team", label: "Team", icon: <UserPlus className="h-4 w-4" /> },
              { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
              { id: "appearance", label: "Appearance", icon: <Palette className="h-4 w-4" /> },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                className="gap-2 border-b-2 border-transparent hover:border-primary/50"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon} {tab.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="font-medium text-[var(--foreground)] mb-4">Your Profile</h3>
                <p className="text-slate-500 dark:text-[var(--muted-foreground)] mb-4">
                  Update your name and avatar. These are shown across the app, including the header.
                </p>

                {profileError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{profileError}</span>
                  </div>
                )}
                {profileSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-400 mb-4">
                    <Check className="h-4 w-4" />
                    <span className="text-sm">Profile saved successfully!</span>
                  </div>
                )}

                <div className="flex items-center gap-4 mb-6">
                  <Avatar
                    name={profileName || user?.email}
                    image={avatarPreview || (pendingAvatarRemoval ? null : (pendingAvatarUrl || user?.avatar)) || null}
                    size="lg"
                  />
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      This avatar is shown in the header and team views.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarUploading}
                      >
                        {avatarUploading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4 mr-2" />
                        )}
                        Upload
                      </Button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleAvatarUpload(file)
                        }}
                        disabled={avatarUploading}
                      />
                      {!pendingAvatarRemoval && (user?.avatar || pendingAvatarUrl) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAvatarRemove}
                          disabled={avatarUploading}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Photo
                        </Button>
                      )}
                      {pendingAvatarRemoval && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPendingAvatarRemoval(false)
                            setPendingAvatar(user?.avatar || "")
                            setPendingAvatarUrl(user?.avatar || "")
                          }}
                          disabled={avatarUploading}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel Removal
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {avatarError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive mb-4">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{avatarError}</span>
                  </div>
                )}
                {avatarSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-success/30 bg-success/10 text-success mb-4">
                    <Check className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">Avatar updated successfully!</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Full Name</Label>
                    <Input
                      id="profile-name"
                      type="text"
                      placeholder="John Doe"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to fall back to your email username.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-avatar">Avatar URL (optional)</Label>
                    <Input
                      id="profile-avatar"
                      type="url"
                      placeholder="https://example.com/avatar.png"
                      value={pendingAvatarUrl}
                      onChange={(e) => {
                        setPendingAvatarUrl(e.target.value)
                        setPendingAvatar(e.target.value)
                      }}
                    />
                    <p className="text-xs text-muted-foreground dark:text-[var(--muted-foreground)]">
                      Or use the upload button above to store your avatar in MongoDB.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                      id="profile-email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground dark:text-[var(--muted-foreground)]">
                      Email cannot be changed here. Contact support to update it.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <Button onClick={handleProfileSave} disabled={profileSaving}>
                      {profileSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    {pendingAvatarRemoval && (
                      <button
                        type="button"
                        className="text-sm text-slate-500 dark:text-[var(--muted-foreground)] hover:text-slate-700 dark:hover:text-[var(--foreground)]"
                        onClick={() => {
                          setPendingAvatarRemoval(false)
                          setPendingAvatar(user?.avatar || "")
                          setPendingAvatarUrl(user?.avatar || "")
                        }}
                      >
                        Cancel removal
                      </button>
                    )}
                    {!pendingAvatarRemoval && profileAvatar && (
                      <button
                        type="button"
                        className="text-sm text-slate-500 dark:text-[var(--muted-foreground)] hover:text-slate-700 dark:hover:text-[var(--foreground)]"
                        onClick={() => {
                          setPendingAvatar(profileAvatar)
                          setPendingAvatarUrl(profileAvatar)
                          setPendingAvatarRemoval(false)
                        }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* General Tab */}
          {activeTab === "general" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="font-medium text-[var(--foreground)] mb-4">Organization Profile</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input id="orgName" defaultValue={org.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgSlug">Slug</Label>
                    <Input id="orgSlug" defaultValue={org.slug} disabled />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="orgDomain">Domain (for client portal)</Label>
                  <Input id="orgDomain" placeholder="yourcompany.com" />
                </div>
                <Button className="mt-4">Save Changes</Button>
              </div>

              <hr className="border-slate-200 dark:border-[var(--border)]" />

              <div>
                <h3 className="font-medium text-[var(--foreground)] mb-4">Billing & Subscription</h3>
                <p className="text-slate-500 dark:text-[var(--muted-foreground)] mb-4">
                  Billing integration requires external credentials. Configure your payment provider
                  (Stripe, Paddle, etc.) in the environment variables.
                </p>
                <div className="p-4 bg-slate-50 dark:bg-[var(--muted)] rounded-lg border border-slate-200 dark:border-[var(--border)]">
                  <p className="text-sm text-muted-foreground dark:text-[var(--muted-foreground)]">
                    Required env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                  </p>
                </div>
              </div>

              <hr className="border-slate-200 dark:border-[var(--border)]" />

              <div>
                <h3 className="font-medium text-[var(--foreground)] mb-4">Integrations</h3>
                <div className="space-y-3">
                  {[
                    { name: "Email Provider", env: "SMTP_HOST, SMTP_USER, SMTP_PASS", status: "not configured" },
                    { name: "Calendar Sync", env: "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET", status: "not configured" },
                    { name: "File Storage", env: "AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET", status: "not configured" },
                    { name: "Webhooks", env: "WEBHOOK_SECRET", status: "not configured" },
                  ].map((int) => (
                    <div key={int.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[var(--muted)] rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-[var(--foreground)]">{int.name}</p>
                        <p className="text-xs text-slate-500 dark:text-[var(--muted-foreground)]">{int.env}</p>
                      </div>
                      <Badge variant="secondary">{int.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === "team" && (
            <div className="space-y-6 max-w-3xl">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-[var(--foreground)]">Team Members ({org.memberships?.length || 0})</h3>
                <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" /> Invite Member
                </Button>
              </div>

              <div className="space-y-3">
                {org.memberships?.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[var(--muted)] rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar name={m.user?.name} image={m.user?.avatar} size="md" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-[var(--foreground)]">
                          {m.user?.name || "Unknown"}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-[var(--muted-foreground)]">{m.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={m.role === "ADMIN" ? "default" : "secondary"}>{m.role}</Badge>
                      {m.role !== "ADMIN" && (
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive">
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Invite Member Dialog */}
              {inviteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h3 className="font-semibold text-lg">Invite Team Member</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setInviteOpen(false)
                          setInviteError("")
                          setInviteSuccess(false)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="p-4 space-y-4">
                      {inviteSuccess && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-400">
                          <Check className="h-4 w-4" />
                          <span className="text-sm">Invitation sent successfully!</span>
                        </div>
                      )}

                      {inviteError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">{inviteError}</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="invite-email">Email Address</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="colleague@company.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          disabled={inviteLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="invite-role">Role</Label>
                        <select
                          id="invite-role"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          disabled={inviteLoading}
                        >
                          <option value="MEMBER">Member</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <p className="text-xs text-muted-foreground dark:text-[var(--muted-foreground)]">
                          Admins can manage team members and settings.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 p-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setInviteOpen(false)
                          setInviteError("")
                          setInviteSuccess(false)
                        }}
                        disabled={inviteLoading}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleInvite} disabled={inviteLoading}>
                        {inviteLoading ? (
                          <>
                            <span className="mr-2 animate-spin">⟳</span>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Invitation
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <hr className="border-slate-200 dark:border-[var(--border)]" />

              <div>
                <h3 className="font-medium text-[var(--foreground)] mb-4">Roles & Permissions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-[var(--border)]">
                        <th className="text-left p-3 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Permission</th>
                        <th className="text-center p-3 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Admin</th>
                        <th className="text-center p-3 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Member</th>
                        <th className="text-center p-3 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Client</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        "View Dashboard",
                        "Manage Clients",
                        "Manage Leads",
                        "Manage Projects",
                        "Manage Tasks",
                        "Manage Invoices",
                        "View Reports",
                        "Manage Team",
                        "Manage Settings",
                        "Manage Billing",
                      ].map((perm) => (
                        <tr key={perm} className="hover:bg-slate-50 dark:hover:bg-[var(--muted)]">
                          <td className="p-3 text-slate-700 dark:text-[var(--foreground)]">{perm}</td>
                          <td className="p-3 text-center text-emerald-600">✓</td>
                          <td className="p-3 text-center text-emerald-600">✓</td>
                          <td className="p-3 text-center text-slate-400 dark:text-[var(--muted-foreground)]">✗</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="font-medium text-[var(--foreground)] mb-4">Notification Preferences</h3>
                <p className="text-slate-500 dark:text-[var(--muted-foreground)] mb-4">
                  Configure when you receive notifications. Email notifications require SMTP configuration.
                </p>
                <div className="space-y-4">
                  {[
                    { label: "New lead assigned", desc: "When a lead is assigned to you" },
                    { label: "Lead status changed", desc: "When a lead moves stages in the pipeline" },
                    { label: "Task due soon", desc: "24 hours before a task is due" },
                    { label: "Task overdue", desc: "When a task becomes overdue" },
                    { label: "Invoice payment received", desc: "When a client pays an invoice" },
                    { label: "Invoice overdue", desc: "When an invoice becomes overdue" },
                    { label: "Project milestone due", desc: "Upcoming project milestones" },
                    { label: "Team mentions", desc: "When someone mentions you in comments" },
                  ].map((notif) => (
                    <div
                      key={notif.label}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[var(--muted)] rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-[var(--foreground)]">{notif.label}</p>
                        <p className="text-sm text-slate-500 dark:text-[var(--muted-foreground)]">{notif.desc}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Bell className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="font-medium text-[var(--foreground)] mb-4">Theme</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { value: "light" as const, label: "Light", preview: "bg-white border-slate-300" },
                    { value: "dark" as const, label: "Dark", preview: "bg-slate-900 border-slate-700" },
                    { value: "system" as const, label: "System", preview: "bg-gradient-to-r from-white to-slate-900 border-slate-300" },
                  ].map((t) => (
                    <Button
                      key={t.value}
                      variant={theme === t.value ? "default" : "outline"}
                      className="h-20 flex-col gap-2"
                      onClick={() => setTheme(t.value)}
                    >
                      <div className={`w-full h-16 rounded-lg border-2 ${t.preview}`} />
                      <span className="text-sm font-medium">{t.label}</span>
                    </Button>
                  ))}
                </div>
                <p className="mt-3 text-sm text-slate-500 dark:text-[var(--muted-foreground)]">
                  Current theme: <span className="font-medium text-slate-700 dark:text-slate-300">{resolvedTheme}</span>
                  {theme === "system" && " (following system preference)"}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-[var(--muted-foreground)]">
                  Current density: <span className="font-medium text-slate-700 dark:text-slate-300">{density}</span>
                </p>
              </div>

              <hr className="border-slate-200 dark:border-[var(--border)]" />

              <div>
                <h3 className="font-medium text-[var(--foreground)] mb-4">Density</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { value: "comfortable" as const, label: "Comfortable", mt1: "mt-3", mt2: "mt-3", mt3: "mt-3 mb-3" },
                    { value: "normal" as const, label: "Normal", mt1: "mt-2", mt2: "mt-2", mt3: "mt-2 mb-2" },
                    { value: "compact" as const, label: "Compact", mt1: "mt-1", mt2: "mt-1", mt3: "mt-1 mb-1" },
                  ].map((d) => (
                    <Button
                      key={d.value}
                      variant={density === d.value ? "default" : "outline"}
                      className="h-20 flex-col gap-2"
                      onClick={() => setDensity(d.value)}
                    >
                      <div className={`w-full h-16 rounded-lg border-2 ${
                        density === d.value ? "bg-slate-50 dark:bg-[var(--muted)] border-primary" : "bg-slate-50 dark:bg-[var(--muted)] border-slate-200 dark:border-[var(--border)]"
                      }`}>
                        <div className={`h-4 bg-slate-200 dark:bg-[var(--muted)] rounded mb-2 ${d.mt1}`} />
                        <div className={`h-4 bg-slate-200 dark:bg-[var(--muted)] rounded ${d.mt2}`} />
                        <div className={`h-4 bg-slate-200 dark:bg-[var(--muted)] rounded ${d.mt3}`} />
                      </div>
                      <span className="text-sm font-medium">{d.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}