/**
 * Session cookie name constant.
 *
 * Kept in its own module so it can be imported by both the auth layer
 * (which is a "use server" file and cannot export non-async values) and
 * the demo-login route (which also needs to clear the cookie).
 */

export const SESSION_COOKIE_NAME = "session"