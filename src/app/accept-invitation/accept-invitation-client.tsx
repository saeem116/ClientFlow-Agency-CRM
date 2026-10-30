"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { IInvitationDocument } from "@/lib/mongoose/invitation"
import { IInvitation } from "@/lib/mongoose/invitation"

export default function AcceptInvitationClient({
  invitation,
}: {
  invitation: IInvitation | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!invitation) {
    return null
  }

  async function handleAccept() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: invitation.token,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to accept invitation")
        setLoading(false)
        return
      }

      setSuccess(true)
      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        router.push("/dashboard")
      }, 1000)
    } catch (err) {
      console.error("Accept invitation error:", err)
      setError("Failed to accept invitation. Please try again.")
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Welcome!
        </h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          You have been added to the organization. Redirecting...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Accepting..." : "Accept Invitation"}
      </button>
      <a
        href="/sign-in"
        className="block text-center text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
      >
        Sign in instead
      </a>
    </div>
  )
}
