#!/usr/bin/env node
/**
 * End-to-end avatar test - traces actual data flow from upload to display
 *
 * Verifies:
 * 1. Upload creates file in GridFS
 * 2. PATCH profile saves the raw GridFS ID to user document
 * 3. GET auth/me returns the URL built from the stored ID
 * 4. Avatar endpoint serves the correct image
 * 5. Replacing avatar updates the reference correctly
 * 6. Removal clears everything
 */
const BASE = "http://localhost:3000"

// Two different small JPEGs - verify they're actually different bytes
const RED_JPEG = Buffer.from(
  "ffd8ffe000104a46494600010100000100010000ffc0000b080001000101011100" +
  "ffc4001f00000102030405060708090a0bffc400b51000020103030204030505040400017dff" +
  "c0000b080001000101011100ffc4001f00000102030405060708090a" +
  "0bffc400b51000020103030204030505040400017dffda0008010100" +
  "03010101013c003f87ffd9",
  "hex"
)

const BLUE_JPEG = Buffer.from(
  "ffd8ffe000104a46494600010100000100010000ffc0000b080001000101011100" +
  "ffc4001f00000102030405060708090a0bffc400b51000020103030204030505040400017dff" +
  "c0000b080001000101011100ffc4001f00000102030405060708090a" +
  "0bffc400b51000020103030204030505040400017dffda0008010100" +
  "03010101013c003f88ffd9",  // slightly different tail
  "hex"
)

// Verify they're different
console.log("Red vs Blue bytes differ:", !RED_JPEG.equals(BLUE_JPEG))

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
    try { json = text ? JSON.parse(text) : null } catch { json = { _raw: text.slice(0, 500) } }
  }
  return { status: res.status, headers: res.headers, body: json, text, ct }
}

let passed = 0, failed = 0
function check(label, cond, detail) {
  if (cond) { passed++; console.log(`  [PASS] ${label}`) }
  else { failed++; console.log(`  [FAIL] ${label} — ${detail || ""}`) }
}

async function main() {
  // Sign in
  const login = await req("POST", "/api/auth/signin", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "avatar-test-user@example.com", password: "password123" }),
  })
  const cookie = login.headers.get("set-cookie").match(/^session=([^;]+)/)[1]
  const auth = { Cookie: `session=${cookie}` }
  const userId = login.body.user.id
  console.log(`\n  userId: ${userId}\n`)

  const mkBody = (img) => {
    const b = "----TestBoundary"
    const h = `--${b}\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
    const f = `\r\n--${b}--\r\n`
    return Buffer.concat([Buffer.from(h), img, Buffer.from(f)])
  }

  // ================================================================
  // CLEAN STATE: delete any existing avatars first
  // ================================================================
  console.log("=== Phase 0: Clean state ===")
  // Try to delete existing (may fail if none exists)
  await req("DELETE", "/api/files/avatar", { headers: auth })
  await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", avatar: null }),
  })
  const cleanMe = await req("GET", "/api/auth/me", { headers: auth })
  check("Clean state: avatar is null", cleanMe.body?.user?.avatar === null,
    `got: ${cleanMe.body?.user?.avatar}`)

  // ================================================================
  // TEST 1: Upload NEW avatar (no prior avatar)
  // ================================================================
  console.log("\n=== Phase 1: Upload red avatar (no prior avatar) ===")

  const up1 = await req("POST", "/api/files/avatar", {
    headers: { ...auth, "Content-Type": "multipart/form-data; boundary=----TestBoundary" },
    body: mkBody(RED_JPEG),
  })
  check("Upload returns 200", up1.status === 200, `status=${up1.status}`)
  const id1 = up1.body?.avatarId
  check("Upload returns avatarId", !!id1, JSON.stringify(up1.body))
  console.log(`  Stored gridfs ID: ${id1}`)

  // Save via PATCH profile
  const patch1 = await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", avatar: id1 }),
  })
  check("PATCH profile success", patch1.status === 200, JSON.stringify(patch1.body))
  const savedAvatar1 = patch1.body?.user?.avatar
  console.log(`  Saved avatar value: ${savedAvatar1}`)
  check("Saved avatar is raw GridFS ID", savedAvatar1 === id1,
    `expected ${id1}, got ${savedAvatar1}`)

  // Check auth/me
  const me1 = await req("GET", "/api/auth/me", { headers: auth })
  const displayUrl1 = me1.body?.user?.avatar
  console.log(`  Display URL from auth/me: ${displayUrl1}`)
  check("auth/me returns display URL",
    displayUrl1 === `/api/avatars/${userId}`,
    `expected /api/avatars/${userId}, got ${displayUrl1}`)

  // Check avatar endpoint serves the correct image
  const av1 = await req("GET", `/api/avatars/${userId}`, { headers: auth })
  check("Avatar endpoint 200", av1.status === 200, `status=${av1.status}`)
  check("Avatar endpoint is JPEG", av1.ct === "image/jpeg", `ct=${av1.ct}`)
  check("Avatar endpoint has no-store cache",
    av1.headers.get("cache-control")?.includes("no-store"),
    `CC=${av1.headers.get("cache-control")}`)

  // ================================================================
  // TEST 2: REPLACE avatar (upload blue, should show blue)
  // ================================================================
  console.log("\n=== Phase 2: Replace with blue avatar ===")

  const up2 = await req("POST", "/api/files/avatar", {
    headers: { ...auth, "Content-Type": "multipart/form-data; boundary=----TestBoundary" },
    body: mkBody(BLUE_JPEG),
  })
  check("Upload blue returns 200", up2.status === 200, `status=${up2.status}`)
  const id2 = up2.body?.avatarId
  check("New ID different from old", id2 !== id1, `id1=${id1} id2=${id2}`)
  console.log(`  New gridfs ID: ${id2}`)

  // Save via PATCH profile
  const patch2 = await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", avatar: id2 }),
  })
  check("PATCH profile success", patch2.status === 200, JSON.stringify(patch2.body))
  const savedAvatar2 = patch2.body?.user?.avatar
  check("Saved avatar updated to new ID", savedAvatar2 === id2,
    `expected ${id2}, got ${savedAvatar2}`)

  // Verify auth/me updated
  const me2 = await req("GET", "/api/auth/me", { headers: auth })
  const displayUrl2 = me2.body?.user?.avatar
  check("auth/me still returns display URL",
    displayUrl2 === `/api/avatars/${userId}`,
    `got ${displayUrl2}`)

  // VERIFY THE ACTUAL IMAGE BYTES CHANGED
  const av2 = await req("GET", `/api/avatars/${userId}`, { headers: auth })
  check("Avatar endpoint still 200", av2.status === 200, `status=${av2.status}`)

  // Compare bytes with first image - they should be different
  const buf1 = Buffer.from(av1.text)
  const buf2 = Buffer.from(av2.text)
  check("Avatar bytes changed after replacement",
    !buf1.equals(buf2),
    `Image bytes identical after replace - OLD IMAGE IS STILL BEING SERVED!`)

  // Also verify it's not the placeholder (1x1 PNG)
  const placeholder = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
  )
  check("Avatar is not the placeholder PNG", !buf2.equals(placeholder), "Got placeholder instead of image!")

  // Check next/image optimizer
  const img2 = await req("GET", `/_next/image?url=${encodeURIComponent(displayUrl2)}&w=64&q=75`, { headers: auth })
  check("next/image optimizer 200", img2.status === 200, `status=${img2.status}`)
  check("next/image has must-revalidate",
    img2.headers.get("cache-control")?.includes("must-revalidate"),
    `CC=${img2.headers.get("cache-control")}`)

  // ================================================================
  // TEST 3: REMOVE avatar
  // ================================================================
  console.log("\n=== Phase 3: Remove avatar ===")

  const del = await req("DELETE", "/api/files/avatar", { headers: auth })
  check("Delete returns 200", del.status === 200, JSON.stringify(del.body))

  // Save removal
  const patchDel = await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", avatar: null }),
  })
  check("PATCH with null success", patchDel.status === 200, JSON.stringify(patchDel.body))
  check("PATCH response has null avatar", patchDel.body?.user?.avatar === null,
    `got ${patchDel.body?.user?.avatar}`)

  // Verify auth/me is null
  const meDel = await req("GET", "/api/auth/me", { headers: auth })
  check("auth/me shows null after remove", meDel.body?.user?.avatar === null,
    `got ${meDel.body?.user?.avatar}`)

  // Verify avatar endpoint returns placeholder (not old image)
  const avDel = await req("GET", `/api/avatars/${userId}`, { headers: auth })
  check("Avatar endpoint 200 after delete", avDel.status === 200, `status=${avDel.status}`)
  check("Avatar endpoint returns PNG placeholder", avDel.ct === "image/png",
    `expected image/png, got ${avDel.ct}`)
  const bufDel = Buffer.from(avDel.text)
  check("Deleted avatar is placeholder PNG, not old JPEG",
    bufDel.equals(placeholder), "Wrong placeholder content!")

  console.log(`\n${"=".repeat(50)}`)
  console.log(`  TOTAL: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1) })
