import { redirect } from "next/navigation"
import { ensureDb, Invitation } from "@/lib/database"
import { verifyToken } from "@/lib/mongoose/invitation"
import AcceptInvitationClient from "./accept-invitation-client"

export const metadata = {
  title: "Accept Invitation - ClientFlow",
  description: "Accept your invitation to join an organization",
}

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const { token } = params

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[var(--background)]">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Invalid Invitation
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            No invitation token provided. Please check your email.
          </p>
        </div>
      </div>
    )
  }

  await ensureDb()

  // Find pending invitation with matching token prefix
  const tokenPrefix = token.substring(0, 8)
  const invitations = await Invitation.find({
    tokenPrefix,
    status: "PENDING",
  }).lean()

  if (!invitations.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[var(--background)]">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Invalid or Expired Invitation
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            This invitation is no longer valid. Please request a new one.
          </p>
        </div>
      </div>
    )
  }

  // Find the invitation whose hash matches the token
  let invitation: (typeof invitations)[0] & { token: string } | null = null
  for (const inv of invitations) {
    if (await verifyToken(token, inv.tokenHash)) {
      invitation = { ...inv, token }
      break
    }
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[var(--background)]">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Invalid Token
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            The invitation token is invalid. Please check your email.
          </p>
        </div>
      </div>
    )
  }

  // Check expiry
  if (new Date(invitation.expiresAt) < new Date()) {
    await Invitation.findByIdAndUpdate(invitation._id, {
      status: "EXPIRED",
    })
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[var(--background)]">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Invitation Expired
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            This invitation has expired. Please request a new one.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[var(--background)]">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Join Your Team
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              You've been invited to join an organization
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Email
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {invitation.email}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Role
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {invitation.role}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Expires
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {new Date(invitation.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <AcceptInvitationClient invitation={invitation as any} />
        </div>
      </div>
    </div>
  )
}
