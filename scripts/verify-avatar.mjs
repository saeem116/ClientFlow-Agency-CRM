#!/usr/bin/env node
/**
 * Verify the full avatar display flow as the UI would experience it.
 */
const BASE = "http://localhost:3000"

const JPEG = Buffer.from(
  "ffd8ffe000104a46494600010100000100010000ffc0000b080001000101011100" +
  "ffc4001f00000102030405060708090a0bffc400b51000020103030204030505040400017dff" +
  "c0000b080001000101011100ffc4001f00000102030405060708090a" +
  "0bffc400b51000020103030204030505040400017dffda0008010100" +
  "03010101013c003f87ffd9",
  "hex"
)

async function req(method, path, opts = {}) {
  const headers = { ...opts.headers }
  const fetchOpts = { method, headers, redirect: "manual" }
  if (opts.body !== undefined) fetchOpts.body = opts.body
  const res = await fetch(BASE + path, fetchOpts)
  const ct = res.headers.get("content-type") || ""
  let text
  try { text = await res.text() } catch { text = "" }
  let json = null
  if (ct.includes("json")) {
    try { json = text ? JSON.parse(text) : null } catch { json = { _raw: text.slice(0, 400) } }
  }
  return { status: res.status, headers: res.headers, body: json, text }
}

async function main() {
  const login = await req("POST", "/api/auth/signin", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "avatar-test-user@example.com", password: "password123" }),
  })
  const cookie = login.headers.get("set-cookie").match(/^session=([^;]+)/)[1]
  const auth = { Cookie: `session=${cookie}` }

  const me0 = await req("GET", "/api/auth/me", { headers: auth })
  const userId = me0.body.user.id
  console.log("userId:", userId)
  console.log("avatar before upload:", me0.body.user.avatar)

  // Upload avatar
  const BOUNDARY = "----TestBoundary"
  const header = `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
  const footer = `\r\n--${BOUNDARY}--\r\n`
  const body = Buffer.concat([Buffer.from(header), JPEG, Buffer.from(footer)])
  const up = await req("POST", "/api/files/avatar", {
    headers: { ...auth, "Content-Type": `multipart/form-data; boundary=${BOUNDARY}` },
    body,
  })
  console.log("Upload avatar:", up.status, up.body)

  // auth/me again — this is what the Avatar component reads
  const me = await req("GET", "/api/auth/me", { headers: auth })
  const avatarUrl = me.body.user.avatar
  console.log("auth/me avatar URL:", avatarUrl)

  // Direct fetch (what next/image optimizer does internally)
  const direct = await req("GET", avatarUrl, { headers: auth })
  console.log("Direct fetch of URL:", direct.status, direct.headers.get("content-type"), "size:", direct.text.length)

  // next/image optimizer (w=64 is an allowed device size)
  const img = await req("GET", `/_next/image?url=${encodeURIComponent(avatarUrl)}&w=64&q=75`, { headers: auth })
  console.log("next/image optimizer:", img.status, img.headers.get("content-type"), "size:", img.text.length)

  // Verify the URL is what the Avatar component would pass to <Image src={...}>
  console.log("\nAvatar component src would be:", avatarUrl)
  console.log("  -> starts with /api/avatars/: ", avatarUrl?.startsWith("/api/avatars/"))
  console.log("  -> matches userId: ", avatarUrl?.endsWith(`/${userId}`))
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1) })