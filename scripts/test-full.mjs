#!/usr/bin/env node
/**
 * Full test: Avatar + Files flow
 */
const BASE = "http://localhost:3000"
let passed = 0, failed = 0

function print(label, status, body) {
  const ok = typeof status === "number" ? (status >= 200 && status < 300) : (body?.success === true || !!body)
  if (ok) passed++; else failed++
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}`)
  if (!ok || process.env.DEBUG) console.log(`       HTTP ${status ?? "(none)"} → ${JSON.stringify(body).slice(0, 600)}`)
}

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

console.log("\n=== STEP 1: Sign in ===")
let cookie = null, userId = null
const login = await req("POST", "/api/auth/signin", {
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "avatar-test-user@example.com", password: "password123" }),
})
if (login.status === 200 && login.body?.user) {
  const m = login.headers.get("set-cookie")?.match(/^session=([^;]+)/)
  if (m) cookie = m[1]
  userId = login.body.user.id
  print("Sign-in", login.status, login.body.user)
} else {
  console.log("  Trying signup...")
  const su = await req("POST", "/api/auth/signup", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "avatar-test-user@example.com", name: "Avatar Test", password: "password123" }),
  })
  if (su.status === 200 && su.body?.user) {
    const m = su.headers.get("set-cookie")?.match(/^session=([^;]+)/)
    if (m) cookie = m[1]
    userId = su.body.user.id
    print("Sign-up", su.status, su.body.user)
  } else {
    print("Sign-in/fail", su.status, su.body)
    console.error("FATAL: No session")
    process.exit(1)
  }
}
console.log(`  userId: ${userId}`)

const auth = { Cookie: `session=${cookie}` }

console.log("\n=== STEP 2: Upload avatar ===")
const JPEG = Buffer.from("ffd8ffe000104a46494600010100000100010000ffc0000b080001000101011100ffc4001f00000102030405060708090a0bffc400b51000020103030204030505040400017dff" + "c0000b080001000101011100ffc4001f00000102030405060708090a" + "0bffc400b51000020103030204030505040400017dffda0008010100" + "03010101013c003f87ffd9", "hex")
const BOUNDARY = "----TestBoundary"
const header = `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
const footer = `\r\n--${BOUNDARY}--\r\n`
const body = Buffer.concat([Buffer.from(header), JPEG, Buffer.from(footer)])
const upload = await req("POST", "/api/files/avatar", {
  headers: { ...auth, "Content-Type": `multipart/form-data; boundary=${BOUNDARY}` },
  body,
})
print("Upload avatar", upload.status, upload.body)
const fileId = upload.body?.fileId

console.log("\n=== STEP 3: Check auth/me ===")
const me = await req("GET", "/api/auth/me", { headers: auth })
print("GET /api/auth/me", me.status, { avatar: me.body?.user?.avatar })
const avatarUrl = me.body?.user?.avatar
print("  Avatar URL present", !!avatarUrl, { url: avatarUrl })

console.log("\n=== STEP 4: Download avatar directly ===")
const avatar = await req("GET", `/api/avatars/${userId}`, { headers: auth })
print("GET /api/avatars", avatar.status, { contentType: avatar.headers.get("content-type"), size: avatar.text.length })

console.log("\n=== STEP 5: next/image optimizer ===")
const encoded = encodeURIComponent(avatarUrl || `/api/avatars/${userId}`)
const imgOpt = await req("GET", `/_next/image?url=${encoded}&w=64&q=75`, { headers: auth })
print("next/image optimizer", imgOpt.status, { contentType: imgOpt.headers.get("content-type"), size: imgOpt.text.length })

console.log("\n=== STEP 6: Upload a document file ===")
const txtContent = "Hello ClientFlow file management test!"
const txtBoundary = "----TxtBoundary"
const txtHeader = `--${txtBoundary}\r\nContent-Disposition: form-data; name="file"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\n`
const txtBody = Buffer.concat([Buffer.from(txtHeader), Buffer.from(txtContent), Buffer.from(`\r\n--${txtBoundary}--\r\n`)])
const txtUpload = await req("POST", "/api/files", {
  headers: { ...auth, "Content-Type": `multipart/form-data; boundary=${txtBoundary}` },
  body: txtBody,
})
print("Upload text file", txtUpload.status, txtUpload.body)
const txtFileId = txtUpload.body?.fileId

console.log("\n=== STEP 7: List files ===")
const list = await req("GET", "/api/files", { headers: auth })
print("List files", list.status, { count: list.body?.files?.length, files: list.body?.files })

console.log("\n=== STEP 8: Download text file ===")
if (txtFileId) {
  const dl = await req("GET", `/api/files/${txtFileId}`, { headers: auth })
  print("Download text file", dl.status, { matches: dl.text === txtContent })
}

console.log("\n=== STEP 9: Delete avatar ===")
const delAvatar = await req("DELETE", "/api/files/avatar", { headers: auth })
print("Delete avatar", delAvatar.status, delAvatar.body)

console.log("\n=== STEP 10: Verify avatar gone ===")
const me2 = await req("GET", "/api/auth/me", { headers: auth })
print("Avatar null after delete", me2.body?.user?.avatar === null, { avatar: me2.body?.user?.avatar })
const avatar2 = await req("GET", `/api/avatars/${userId}`, { headers: auth })
print("Avatar endpoint after delete", avatar2.status, { note: avatar2.status === 404 ? "Expected 404" : "Still has image" })

console.log("\n=== STEP 11: Delete text file ===")
if (txtFileId) {
  const delTxt = await req("DELETE", `/api/files?fileId=${encodeURIComponent(txtFileId)}`, { headers: auth })
  print("Delete text file", delTxt.status, delTxt.body)
  const dl2 = await req("GET", `/api/files/${txtFileId}`, { headers: auth })
  print("Verify file gone", dl2.status === 404, { status: dl2.status })
}

console.log("\n=== SUMMARY ===")
console.log(`  Results: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
