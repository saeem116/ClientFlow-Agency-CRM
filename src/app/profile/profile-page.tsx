"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Mail,
  Phone,
  Shield,
  Camera,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  ArrowLeft,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export interface UserProfile {
  id: string
  email: string
  name: string | null
  avatar: string | null
  role: string
  organizationRole: string
  phone: string | null
}

export interface ProfileOrg {
  id: string
  name: string
  slug: string
}

interface ProfilePageProps {
  user: UserProfile | null
  org: ProfileOrg | null
  isDemo: boolean
}

export function ProfilePage({ user, org, isDemo }: ProfilePageProps) {
  const { refresh } = useAuth()

  // Profile editing state
  const [profileName, setProfileName] = useState(user?.name || "")
  const [profilePhone, setProfilePhone] = useState(user?.phone || "")
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState(user?.avatar || "")
  const [pendingAvatar, setPendingAvatar] = useState(user?.avatar || "")
  const [pendingAvatarRemoval, setPendingAvatarRemoval] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarSuccess, setAvatarSuccess] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Revoke preview URL on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const displayName = user ? `${user.name || user.email.split("@")[0]}` : ""
  const profileAvatar = avatarPreview || (pendingAvatarRemoval ? null : (pendingAvatarUrl || user?.avatar)) || null

  const handleProfileSave = async () => {
    setProfileError("")
    setProfileSuccess(false)
    setProfileSaving(true)
    try {
      const body: Record<string, unknown> = { name: profileName }
      if (profilePhone !== undefined) {
        body.phone = profilePhone || null
      }
      // Include avatar only if it changed from the server's current value.
      const hadAvatarBefore = !!user?.avatar
      const hasAvatarNow = pendingAvatarRemoval ? false : !!pendingAvatar
      const avatarChanged = hadAvatarBefore !== hasAvatarNow || (pendingAvatar && pendingAvatar !== user?.avatar)
      if (avatarChanged) {
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
      await refresh()
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
        URL.revokeObjectURL(objectUrl)
        setAvatarPreview(null)
        setAvatarError(data.error || "Upload failed")
        return
      }
      await refresh()
      URL.revokeObjectURL(objectUrl)
      setAvatarPreview(null)
      const newAvatarUrl = user?.id ? `/api/avatars/${user.id}` : ""
      setPendingAvatarUrl(newAvatarUrl)
      setPendingAvatar(data.avatarId)
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
    setPendingAvatarRemoval(true)
    setAvatarPreview(null)
    setPendingAvatar("")
  }

  const handlePasswordChange = async () => {
    setPasswordError("")
    setPasswordSuccess(false)
    setPasswordSaving(true)
    try {
      const response = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
        credentials: "include",
      })
      const data = await response.json()
      if (!response.ok) {
        setPasswordError(data.error || "Failed to change password")
        return
      }
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordSuccess(true)
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch {
      setPasswordError("An error occurred. Please try again.")
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings" aria-label="Back to settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-[var(--foreground)]">My Profile</h1>
          <p className="text-slate-500 dark:text-[var(--muted-foreground)] mt-0.5">
            Manage your personal information and account security.
          </p>
        </div>
      </div>

      {/* Demo account banner */}
      {isDemo && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">
            You are signed in as the demo account. Profile and password changes are disabled.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — summary card */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Profile Summary</h2>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center gap-4 pb-4">
                <Avatar
                  name={displayName}
                  image={profileAvatar}
                  size="xl"
                />
                <div>
                  <p className="text-lg font-semibold text-[var(--foreground)]">
                    {displayName || "User"}
                  </p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="secondary">{user?.organizationRole || "MEMBER"}</Badge>
                  {org && (
                    <Badge variant="outline" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      {org.name}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column — editable sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Card */}
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Personal Information</h2>
            </CardHeader>
            <CardContent>
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

              {/* Avatar section */}
              <div className="flex items-start gap-4 mb-6">
                <Avatar
                  name={displayName}
                  image={profileAvatar}
                  size="lg"
                />
                <div className="flex flex-col gap-2 min-w-0">
                  <p className="text-sm text-muted-foreground">
                    This avatar is shown in the header, sidebar, and team views.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading || isDemo}
                    >
                      {avatarUploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4 mr-2" />
                      )}
                      Upload Photo
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
                      disabled={avatarUploading || isDemo}
                    />
                    {!pendingAvatarRemoval && (user?.avatar || pendingAvatarUrl) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAvatarRemove}
                        disabled={avatarUploading || isDemo}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
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
                        <span className="mr-2">↩</span>
                        Cancel Removal
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      disabled={isDemo}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={profilePhone || ""}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      disabled={isDemo}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground dark:text-[var(--muted-foreground)]">
                    Email cannot be changed here. Contact support to update it.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Role
                  </Label>
                  <Input
                    id="role"
                    value={user?.organizationRole || "MEMBER"}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground dark:text-[var(--muted-foreground)]">
                    Role changes require administrator access.
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <Button onClick={handleProfileSave} disabled={profileSaving || isDemo}>
                    {profileSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  {(pendingAvatarRemoval || profileName !== user?.name || profilePhone !== user?.phone) && (
                    <button
                      type="button"
                      className="text-sm text-slate-500 dark:text-[var(--muted-foreground)] hover:text-slate-700 dark:hover:text-[var(--foreground)]"
                      onClick={() => {
                        setProfileName(user?.name || "")
                        setProfilePhone(user?.phone || "")
                        setPendingAvatarRemoval(false)
                        setPendingAvatar(user?.avatar || "")
                        setPendingAvatarUrl(user?.avatar || "")
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Change Password</h2>
            </CardHeader>
            <CardContent>
              {passwordError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{passwordError}</span>
                </div>
              )}
              {passwordSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-400 mb-4">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Password changed successfully!</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrent ? "text" : "password"}
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={passwordSaving || isDemo}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      disabled={isDemo}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed"
                      aria-label={showCurrent ? "Hide password" : "Show password"}
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNew ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={passwordSaving || isDemo}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      disabled={isDemo}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed"
                      aria-label={showNew ? "Hide password" : "Show password"}
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-[var(--muted-foreground)]">
                    Password must be at least 8 characters long.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={passwordSaving || isDemo}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      disabled={isDemo}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handlePasswordChange}
                  disabled={passwordSaving || isDemo}
                >
                  {passwordSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Change Password
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
