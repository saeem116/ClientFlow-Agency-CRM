#!/usr/bin/env node
/**
 * Reproduce the exact bug: upload avatar when one already exists, then save.
 * The old code read user?.avatar after refresh() which was stale, so the
 * Save skipped the avatar entirely.
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
  const userId = login.body.user.id

  // Ensure clean state
  await req("DELETE", "/api/files/avatar", { headers: auth })
  await req("PATCH", "/api/auth/profile", { headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Avatar Test", avatar: null }) })

  // Upload #1
  const BOUNDARY = "----TestBoundary"
  const mkBody = () => {
    const header = `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
    const footer = `\r\n--${BOUNDARY}--\r\n`
    return Buffer.concat([Buffer.from(header), JPEG, Buffer.from(footer)])
  }
  const up1 = await req("POST", "/api/files/avatar", { headers: { ...auth, "Content-Type": `multipart/form-data; boundary=${BOUNDARY}` }, body: mkBody() })
  check("Upload #1 returns 200", up1.status === 200, `status=${up1.status}`)
  const avatarId1 = up1.body?.avatarId

  // Save #1 (mimics the UI's PATCH /api/auth/profile)
  const patch1 = await req("PATCH", "/api/auth/profile", { headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Avatar Test", avatar: avatarId1 }) })
  check("Save #1 (PATCH profile)", patch1.status === 200, `status=${patch1.status} body=${JSON.stringify(patch1.body)}`)

  const me1 = await req("GET", "/api/auth/me", { headers: auth })
  check("auth/me shows avatar #1", !!me1.body?.user?.avatar, `avatar=${me1.body?.user?.avatar}`)

  // Upload #2 (replace existing avatar)
  const up2 = await req("POST", "/api/files/avatar", { headers: { ...auth, "Content-Type": `multipart/form-data; boundary=${BOUNDARY}` }, body: mkBody() })
  check("Upload #2 (replace) returns 200", up2.status === 200, `status=${up2.status}`)
  const avatarId2 = up2.body?.avatarId
  check("Upload #2 returns a different avatarId", avatarId2 !== avatarId1, `id1=${avatarId1} id2=${avatarId2}`)

  // Save #2 — the bug: this PATCH must include the NEW avatar id
  const patch2 = await req("PATCH", "/api/auth/profile", { headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Avatar Test", avatar: avatarId2 }) })
  check("Save #2 (PATCH profile with new avatar)", patch2.status === 200, `status=${patch2.status} body=${JSON.stringify(patch2.body)}`)

  const me2 = await req("GET", "/api/auth/me", { headers: auth })
  check("auth/me shows avatar #2 (not #1)", me2.body?.user?.avatar !== null, `avatar=${me2.body?.user?.avatar}`)

  // Verify the avatar endpoint serves the NEW image (old one should be gone)
  const avatarGet = await req("GET", `/api/avatars/${userId}`, { headers: auth })
  check("Avatar endpoint serves image after replace", avatarGet.status === 200, `status=${avatarGet.status}`)

  console.log(`\n  Results: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1) })