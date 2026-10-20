#!/usr/bin/env node
const BASE = "http://localhost:3000"

async function req(method, path, opts = {}) {
  const headers = { ...opts.headers }
  const fetchOpts = { method, headers, redirect: "manual" }
  if (opts.body !== undefined) fetchOpts.body = opts.body
  const res = await fetch(BASE + path, fetchOpts)
  const ct = res.headers.get("content-type") || ""
  let text = ""
  try { text = await res.text() } catch {}
  let json = null
  if (ct.includes("json")) {
    try { json = text ? JSON.parse(text) : null } catch { json = { _raw: text.slice(0, 500) } }
  }
  return { status: res.status, headers: res.headers, body: json, text, ct }
}

async function main() {
  const login = await req("POST", "/api/auth/signin", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "avatar-test-user@example.com", password: "password123" }),
  })
  const cookie = login.headers.get("set-cookie").match(/^session=([^;]+)/)?.[1]
  const auth = { Cookie: `session=${cookie}` }
  const userId = login.body.user.id
  console.log("userId:", userId)

  const mkBody = (suffix) => {
    const b = "----TestBoundary"
    const header = `--${b}\r\nContent-Disposition: form-data; name="file"; filename="test_${suffix}.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
    const footer = `\r\n--${b}--\r\n`
    // Valid JPEG: starts with FFD8FFE0, ends with FFD9. Append suffix in the middle.
    const jpegHeader = Buffer.from("ffd8ffe000104a46494600010100000100010000ffc0000b080001000101011100", "hex")
    const jpegFooter = Buffer.from("ffd9", "hex")
    const payload = Buffer.from(suffix.repeat(50))
    return Buffer.concat([Buffer.from(header), jpegHeader, payload, jpegFooter, Buffer.from(footer)])
  }

  // Phase 0: Clean state
  console.log("\n=== Phase 0: Clean ===")
  await req("DELETE", "/api/files/avatar", { headers: auth })
  await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", avatar: null }),
  })
  const me0 = await req("GET", "/api/auth/me", { headers: auth })
  console.log("me0 avatar:", me0.body?.user?.avatar)

  // Phase 1: Upload A
  console.log("\n=== Phase 1: Upload A ===")
  const upA = await req("POST", "/api/files/avatar", {
    headers: { ...auth, "Content-Type": "multipart/form-data; boundary=----TestBoundary" },
    body: mkBody("AAAA"),
  })
  console.log("upload A:", upA.status, JSON.stringify(upA.body))
  const idA = upA.body?.avatarId
  console.log("idA:", idA)

  // Save A via PATCH
  const patchA = await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", avatar: idA }),
  })
  console.log("patch A:", patchA.status, "response avatar:", patchA.body?.user?.avatar)

  // Check me after save
  const meA = await req("GET", "/api/auth/me", { headers: auth })
  console.log("me after save A:", meA.body?.user?.avatar)

  // Check avatar endpoint
  const avA = await req("GET", `/api/avatars/${userId}`, { headers: auth })
  console.log("avatar endpoint A:", avA.status, avA.ct, "len:", avA.text.length, "hasAAAA:", avA.text.includes("AAAA"))

  // Phase 2: Upload B (replace)
  console.log("\n=== Phase 2: Upload B ===")
  const upB = await req("POST", "/api/files/avatar", {
    headers: { ...auth, "Content-Type": "multipart/form-data; boundary=----TestBoundary" },
    body: mkBody("BBBB"),
  })
  console.log("upload B:", upB.status, JSON.stringify(upB.body))
  const idB = upB.body?.avatarId
  console.log("idB:", idB, "idA==idB?", idA === idB)

  // Save B via PATCH
  const patchB = await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", avatar: idB }),
  })
  console.log("patch B:", patchB.status, "response avatar:", patchB.body?.user?.avatar)

  // Check me after save B
  const meB = await req("GET", "/api/auth/me", { headers: auth })
  console.log("me after save B:", meB.body?.user?.avatar)

  // Check avatar endpoint - SHOULD BE B NOW
  const avB = await req("GET", `/api/avatars/${userId}`, { headers: auth })
  console.log("avatar endpoint B:", avB.status, avB.ct, "len:", avB.text.length)
  console.log("  hasAAAA (old):", avB.text.includes("AAAA"))
  console.log("  hasBBBB (new):", avB.text.includes("BBBB"))
  console.log("  startsWith:", JSON.stringify(avB.text.slice(0, 60)))

  // next/image
  const imgB = await req("GET", `/_next/image?url=${encodeURIComponent(`/api/avatars/${userId}`)}&w=64&q=75`, { headers: auth })
  console.log("next/image B:", imgB.status, imgB.ct, "CC:", imgB.headers.get("cache-control"))
  console.log("  hasAAAA:", imgB.text.includes("AAAA"))
  console.log("  hasBBBB:", imgB.text.includes("BBBB"))

  // Phase 3: Delete
  console.log("\n=== Phase 3: Delete ===")
  const del = await req("DELETE", "/api/files/avatar", { headers: auth })
  console.log("delete:", del.status, JSON.stringify(del.body))

  const patchNull = await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", avatar: null }),
  })
  console.log("patch null:", patchNull.status, "response avatar:", patchNull.body?.user?.avatar)

  const meDel = await req("GET", "/api/auth/me", { headers: auth })
  console.log("me after delete:", meDel.body?.user?.avatar)

  const avDel = await req("GET", `/api/avatars/${userId}`, { headers: auth })
  console.log("avatar endpoint after delete:", avDel.status, avDel.ct, "len:", avDel.text.length)
  console.log("  is placeholder PNG:", avDel.ct === "image/png" && avDel.text.length < 200)
}

main().catch(e => { console.error("ERROR:", e); process.exit(1) })
