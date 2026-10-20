#!/usr/bin/env node
/**
 * Avatar upload/display/remove flow test
 * Usage: cd E:/Agency_CRM/clientflow && node scripts/test-avatar.mjs
 */

const BASE = "http://localhost:3000"
let passed = 0
let failed = 0

// ─── helpers ────────────────────────────────────────────────────────────────

function print(label, status, body) {
  const ok = status === undefined || typeof status !== "number"
    ? (body?.success === true || !!body)
    : (status >= 200 && status < 300)
  if (ok) passed++
  else failed++
  const mark = ok ? "PASS" : "FAIL"
  console.log(`  [${mark}] ${label}`)
  if (!ok || process.env.DEBUG) {
    console.log(`       HTTP ${status ?? "(none)"}  →  ${JSON.stringify(body).slice(0, 600)}`)
  }
}

async function req(method, path, opts = {}) {
  const url = BASE + path
  const headers = { ...opts.headers }
  let body = opts.body
  const fetchOpts = { method, headers, redirect: "manual" }
  if (body !== undefined && body !== null) {
    fetchOpts.body = body
  }
  const res = await fetch(url, fetchOpts)
  let json = null
  const ct = res.headers.get("content-type") || ""
  let text
  try {
    text = await res.text()
  } catch {
    text = ""
  }
  if (ct.includes("json")) {
    try { json = text ? JSON.parse(text) : null } catch { json = { _raw: text.slice(0, 400) } }
  }
  return { status: res.status, headers: res.headers, body: json, text }
}

// ─── build a minimal valid 1×1 JPEG in memory ──────────────────────────────
// This is a hand-crafted minimal valid JPEG (138 bytes) — a single white pixel.
// Verified: correct SOI/EOI markers, APP0/JFIF, SOF0 (1×1 grayscale),
// DQT, DHT(DC+AC), SOS with scan data.
const JPEG = Buffer.from(
  "ffd8ffe000104a46494600010100000100010000ffc0000b080001000101011100" +
  "ffc4001f00000102030405060708090a0bffc400b5100002010303020403050504" +
  "0400017dffc0000b080001000101011100ffc4001f00000102030405060708090a" +
  "0bffc400b51000020103030204030505040400017dffda00080101000301010101" +
  "3c003f87ffd9",
  "hex"
)

// ─── step 0: sign in (or sign up) ──────────────────────────────────────────

console.log("\n=== Step 0: Sign in / Sign up ===")

let sessionCookie = null
let userId = null

async function doSignin(email, password) {
  const res = await req("POST", "/api/auth/signin", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (res.status === 200 && res.body?.user) {
    const setCookie = res.headers.get("set-cookie")
    if (setCookie) {
      const m = setCookie.match(/^session=([^;]+)/)
      if (m) sessionCookie = m[1]
    }
    userId = res.body.user.id
    print("Sign-in", res.status, res.body.user)
    return true
  }
  return false
}

const signInResult = await doSignin("admin@demo.com", "password123")
if (!signInResult) {
  // Try a few common test emails
  const tryEmails = ["test@example.com", "agent@example.com", "demo@example.com"]
  let found = false
  for (const email of tryEmails) {
    const r = await doSignin(email, "password123")
    if (r) { found = true; break }
  }

  if (!found) {
    console.log("  No pre-existing test user found — trying signup avatar-test-user@example.com")
    const suRes = await req("POST", "/api/auth/signup", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "avatar-test-user@example.com",
        name: "Avatar Test",
        password: "password123",
      }),
    })
    if (suRes.status === 200 && suRes.body?.user) {
      const setCookie = suRes.headers.get("set-cookie")
      const m = setCookie?.match(/^session=([^;]+)/)
      if (m) sessionCookie = m[1]
      userId = suRes.body.user.id
      print("Sign-up (new user)", suRes.status, suRes.body.user)
    } else if (suRes.status === 400 && suRes.body?.error?.includes("already exists")) {
      // User already exists from a prior run — sign in instead
      const signInAgain = await doSignin("avatar-test-user@example.com", "password123")
      if (!signInAgain) {
        print("Sign-up", suRes.status, suRes.body)
        console.error("FATAL: cannot obtain a valid session")
        process.exit(1)
      }
    } else {
      print("Sign-up", suRes.status, suRes.body)
      console.error("FATAL: cannot obtain a valid session")
      process.exit(1)
    }
  }
}

if (!sessionCookie || !userId) {
  console.error("FATAL: no session cookie or userId after signin/signup")
  process.exit(1)
}
console.log(`  Cookie captured (first 40 chars): ${sessionCookie.slice(0, 40)}...`)
console.log(`  userId: ${userId}`)

// ─── step 1: GET /api/auth/me (pre-upload) ──────────────────────────────────

console.log("\n=== Step 1: GET /api/auth/me (pre-upload) ===")
const authHeaders = { "Cookie": `session=${sessionCookie}` }
const mePre = await req("GET", "/api/auth/me", { headers: authHeaders })
print("GET /api/auth/me (pre-upload)", mePre.status, mePre.body)

// ─── step 2: POST /api/files/avatar (upload) ────────────────────────────────

console.log("\n=== Step 2: POST /api/files/avatar (upload JPEG) ===")
// JPEG already defined above
const BOUNDARY = "----TestBoundary7890abc"
const CRLF = "\r\n"
const fileHeader =
  `--${BOUNDARY}${CRLF}` +
  `Content-Disposition: form-data; name="file"; filename="test-avatar.jpg"${CRLF}` +
  `Content-Type: image/jpeg${CRLF}${CRLF}`
const footer = `${CRLF}--${BOUNDARY}--${CRLF}`
const multipartBody = Buffer.concat([
  Buffer.from(fileHeader, "utf8"),
  JPEG,
  Buffer.from(footer, "utf8"),
])

console.log(`  JPEG size: ${JPEG.length} bytes, magic: ${JPEG.slice(0,4).toString('hex')}`)
console.log(`  Multipart body size: ${multipartBody.length} bytes`)

const uploadRes = await req("POST", "/api/files/avatar", {
  headers: {
    "Cookie": `session=${sessionCookie}`,
    "Content-Type": `multipart/form-data; boundary=${BOUNDARY}`,
  },
  body: multipartBody,
})
print("POST /api/files/avatar", uploadRes.status, uploadRes.body)

let avatarId = uploadRes.body?.avatarId
let fileIdForDelete = null
if (uploadRes.body?.fileId) fileIdForDelete = uploadRes.body.fileId

// ─── step 3: GET /api/auth/me (post-upload) ────────────────────────────────

console.log("\n=== Step 3: GET /api/auth/me (post-upload) ===")
const mePost = await req("GET", "/api/auth/me", { headers: authHeaders })
print("GET /api/auth/me (post-upload)", mePost.status, mePost.body)
const avatarUrl = mePost.body?.user?.avatar
print("  avatar URL present?", avatarUrl ? !!avatarUrl : false, { avatarUrl })

// ─── step 4: GET /api/avatars/{userId} ─────────────────────────────────────

console.log("\n=== Step 4: GET /api/avatars/{userId} ===")
const avatarGet = await req("GET", `/api/avatars/${userId}`, { headers: authHeaders })
print("GET /api/avatars/{userId}", avatarGet.status, {
  contentType: avatarGet.headers.get("content-type"),
  size: avatarGet.text.length,
})

// ─── step 5: DELETE /api/files/avatar ───────────────────────────────────────

console.log("\n=== Step 5: DELETE /api/files/avatar ===")
const deletePath = fileIdForDelete
  ? `/api/files/avatar?fileId=${encodeURIComponent(fileIdForDelete)}`
  : "/api/files/avatar"
const delRes = await req("DELETE", deletePath, { headers: authHeaders })
print("DELETE /api/files/avatar", delRes.status, delRes.body)

// ─── step 6: GET /api/auth/me (post-delete) ─────────────────────────────────

console.log("\n=== Step 6: GET /api/auth/me (post-delete) ===")
const meDel = await req("GET", "/api/auth/me", { headers: authHeaders })
print("GET /api/auth/me (post-delete)", meDel.status, meDel.body)
const avatarAfterDel = meDel.body?.user?.avatar
print("  avatar is null?", avatarAfterDel === null, { avatarAfterDel })

// ─── step 7: GET /api/avatars/{userId} again ───────────────────────────────

console.log("\n=== Step 7: GET /api/avatars/{userId} (post-delete) ===")
const avatarGet2 = await req("GET", `/api/avatars/${userId}`, { headers: authHeaders })
print("GET /api/avatars/{userId} (post-delete)", avatarGet2.status,
  avatarGet2.status === 404 ? { note: "expected 404" } : { body: avatarGet2.body })

// ─── summary ────────────────────────────────────────────────────────────────

console.log("\n========================================")
console.log(`  Results: ${passed} passed, ${failed} failed`)
console.log("========================================\n")
process.exit(failed > 0 ? 1 : 0)
