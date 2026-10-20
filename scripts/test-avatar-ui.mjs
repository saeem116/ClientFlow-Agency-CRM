#!/usr/bin/env node
/**
 * Mimics the exact UI flow for avatar upload / remove / save:
 *   1. POST /api/files/avatar            (upload)
 *   2. PATCH /api/auth/profile           (save with new avatar id)
 *   3. GET  /api/auth/me                 (verify header shows new avatar)
 *   4. DELETE /api/files/avatar          (remove)
 *   5. PATCH /api/auth/profile {avatar:null} (save removal)
 *   6. GET  /api/auth/me                 (verify avatar is null)
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

let passed = 0, failed = 0
function check(label, cond, detail) {
  if (cond) { passed++; console.log(`  [PASS] ${label}`) }
  else { failed++; console.log(`  [FAIL] ${label} — ${detail || ""}`) }
}

async function main() {
  const login = await req("POST", "/api/auth/signin", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "avatar-test-user@example.com", password: "password123" }),
  })
  const cookie = login.headers.get("set-cookie").match(/^session=([^;]+)/)[1]
  const auth = { Cookie: `session=${cookie}` }

  // --- Upload ---
  const BOUNDARY = "----TestBoundary"
  const header = `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
  const footer = `\r\n--${BOUNDARY}--\r\n`
  const body = Buffer.concat([Buffer.from(header), JPEG, Buffer.from(footer)])
  const up = await req("POST", "/api/files/avatar", {
    headers: { ...auth, "Content-Type": `multipart/form-data; boundary=${BOUNDARY}` },
    body,
  })
  check("Upload avatar returns 200", up.status === 200, `status=${up.status}`)
  const avatarId = up.body?.avatarId
  check("Upload returns avatarId", !!avatarId, JSON.stringify(up.body))

  // --- Save via PATCH /api/auth/profile ---
  const patch1 = await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Avatar Test", avatar: avatarId }),
  })
  check("PATCH profile with avatar", patch1.status === 200, `status=${patch1.status} body=${JSON.stringify(patch1.body)}`)

  // --- GET /api/auth/me ---
  const me1 = await req("GET", "/api/auth/me", { headers: auth })
  const avatarUrl = me1.body?.user?.avatar
  check("auth/me shows avatar", !!avatarUrl, `avatar=${avatarUrl}`)
  // Avatar URL is keyed by userId (not the raw avatarId) so next/image can fetch it
  check("auth/me avatar URL points to /api/avatars/<userId>", avatarUrl?.startsWith("/api/avatars/"), `url=${avatarUrl}`)
  check("auth/me avatar URL matches signed-in user", avatarUrl?.endsWith(`/${login.body.user.id}`), `url=${avatarUrl}`)

  // --- Remove: DELETE /api/files/avatar ---
  const del = await req("DELETE", "/api/files/avatar", { headers: auth })
  check("DELETE avatar returns 200", del.status === 200, `status=${del.status} body=${JSON.stringify(del.body)}`)

  // --- Save removal via PATCH /api/auth/profile { avatar: null } ---
  const patch2 = await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Avatar Test", avatar: null }),
  })
  check("PATCH profile with avatar=null", patch2.status === 200, `status=${patch2.status} body=${JSON.stringify(patch2.body)}`)
  check("PATCH response avatar is null", patch2.body?.user?.avatar === null, `avatar=${patch2.body?.user?.avatar}`)

  // --- GET /api/auth/me again ---
  const me2 = await req("GET", "/api/auth/me", { headers: auth })
  check("auth/me avatar is null after remove+save", me2.body?.user?.avatar === null, `avatar=${me2.body?.user?.avatar}`)

  console.log(`\n  Results: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1) })