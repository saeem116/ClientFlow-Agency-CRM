import { redirect } from "next/navigation"

/**
 * `/login` is a legacy alias for `/sign-in`. Both routes were shipping a
 * near-identical sign-in form, which meant two sources of truth for the
 * authentication UI and an easy place for them to drift apart.
 *
 * We keep the URL working (existing links/bookmarks stay valid) but funnel
 * everyone to the canonical `/sign-in` page. This is a server-side redirect,
 * so it happens before any client JavaScript loads.
 */
export default function LoginRedirect() {
  redirect("/sign-in")
}

export const metadata = {
  title: "Redirecting to Sign In - ClientFlow",
  description: "Redirecting to the sign in page",
}