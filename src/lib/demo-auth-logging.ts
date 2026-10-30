/**
 * Structured diagnostic logging for demo authentication.
 *
 * Logs only boolean/status information — never passwords, hashes, MongoDB
 * URIs, session tokens, or authentication secrets. Each event is a single
 * JSON line so it can be grepped in production logs.
 *
 * The events are sufficient to distinguish a missing account from a
 * password mismatch, a missing membership from a session creation failure,
 * and a misconfigured demo database from a wrong password.
 */

type DemoAuthEvent =
  | "demo_login_selected"
  | "demo_database_connected"
  | "demo_user_found"
  | "demo_password_hash_present"
  | "demo_password_verified"
  | "demo_membership_found"
  | "demo_session_created"
  | "demo_database_unavailable"
  | "demo_session_failed"

interface DemoAuthLogEntry {
  event: DemoAuthEvent
  at: string
  detail?: string
}

function emit(event: DemoAuthEvent, detail?: string): void {
  const entry: DemoAuthLogEntry = { event, at: new Date().toISOString() }
  if (detail !== undefined) entry.detail = detail
  // eslint-disable-next-line no-console
  console.log("[demo-auth]", JSON.stringify(entry))
}

export const DemoAuthLog = {
  loginSelected: () => emit("demo_login_selected"),
  databaseConnected: () => emit("demo_database_connected"),
  databaseUnavailable: (reason?: string) =>
    emit("demo_database_unavailable", reason),
  userFound: () => emit("demo_user_found"),
  userNotFound: () => emit("demo_user_found", "false"),
  passwordHashPresent: () => emit("demo_password_hash_present"),
  passwordHashMissing: () => emit("demo_password_hash_present", "false"),
  passwordVerified: () => emit("demo_password_verified"),
  passwordMismatch: () => emit("demo_password_verified", "false"),
  passwordVerifyError: () => emit("demo_password_verified", "error"),
  membershipFound: () => emit("demo_membership_found"),
  membershipNotFound: () => emit("demo_membership_found", "false"),
  sessionCreated: () => emit("demo_session_created"),
  sessionFailed: (reason?: string) => emit("demo_session_failed", reason),
}