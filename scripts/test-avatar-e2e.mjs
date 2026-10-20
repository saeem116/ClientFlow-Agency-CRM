#!/usr/bin/env node
/**
 * End-to-end avatar test - traces actual data flow from upload to display.
 * Uses valid JPEG bytes with unique payload markers so we can verify
 * the correct image is served at every step.
 */
const BASE = "http://localhost:3000"

// Build a valid JPEG buffer with a unique marker embedded in the image data.
// Valid JPEG: SOI (FFD8) + APP0 (FFE0) header + SOS/entropy data + EOI (FFD9).
const mkJPEG = (marker) => {
  const prefix = Buffer.from(
    "ffd8ffe000104a46494600010100000100010000ffc0000b08" +
    "0001000101011100ffc4001f00000102030405060708090a" +
    "0bffc400b51000020103030204030505040400017dff",
    "hex"
  )
  // marker repeated 50 times as the image payload
  const payload = Buffer.from(marker.repeat(50))
  const suffix = Buffer.from("da000801010003010101013c003f87ffd9", "hex")
  return Buffer.concat([prefix, payload, suffix])
}

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

let passed = 0, failed = 0
function check(label, cond, detail) {
  if (cond) { passed++; console.log(`  [PASS] ${label}`) }
  else { failed++; console.log(`  [FAIL] ${label} — ${detail || ""}`) }
}

async function main() {
  // ── Sign in ──────────────────────────────────────────────────────────
  const login = await req("POST", "/api/auth/signin", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "avatar-test-user@example.com", password: "password123" }),
  })
  const cookie = login.headers.get("set-cookie").match(/^session=([^;]+)/)?.[1]
  const auth = { Cookie: `session=${cookie}` }
  const userId = login.body.user.id
  console.log(`\n  userId: ${userId}\n`)

  const mkMultipart = (img) => {
    const b = "----TestBoundary"
    const header = `--${b}\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
    const footer = `\r\n--${b}--\r\n`
    return Buffer.concat([Buffer.from(header), img, Buffer.from(footer)])
  }
  const displayUrl = `/api/avatars/${userId}`

  // ── Phase 0: Clean state ─────────────────────────────────────────────
  console.log("=== Phase 0: Clean state ===")
  await req("DELETE", "/api/files/avatar", { headers: auth })
  await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", avatar: null }),
  })
  const me0 = await req("GET", "/api/auth/me", { headers: auth })
  check("No avatar at start", me0.body?.user?.avatar === null,
    `got: ${me0.body?.user?.avatar}`)

  // ── Phase 1: Upload avatar A ─────────────────────────────────────────
  console.log("\n=== Phase 1: Upload red avatar (A) ===")
  const imgA = mkJPEG("AAAA")
  const upA = await req("POST", "/api/files/avatar", {
    headers: { ...auth, "Content-Type": "multipart/form-data; boundary=----TestBoundary" },
    body: mkMultipart(imgA),
  })
  check("Upload A returns 200", upA.status === 200, `status=${upA.status}`)
  const idA = upA.body?.avatarId
  check("Upload A returns avatarId", !!idA, JSON.stringify(upA.body))
  console.log(`  Stored GridFS ID: ${idA}`)

  // Save via PATCH profile
  const patchA = await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", avatar: idA }),
  })
  check("PATCH profile with A succeeds", patchA.status === 200,
    `status=${patchA.status} body=${JSON.stringify(patchA.body)}`)
  check("PATCH response stores raw GridFS ID", patchA.body?.user?.avatar === idA,
    `expected ${idA}, got ${patchA.body?.user?.avatar}`)

  // auth/me returns the display URL
  const meA = await req("GET", "/api/auth/me", { headers: auth })
  check("auth/me returns display URL", meA.body?.user?.avatar === displayUrl,
    `expected ${displayUrl}, got ${meA.body?.user?.avatar}`)

  // Avatar endpoint serves image A
  const avA = await req("GET", displayUrl, { headers: auth })
  check("Avatar endpoint returns 200", avA.status === 200, `status=${avA.status}`)
  check("Avatar endpoint is JPEG", avA.ct === "image/jpeg", `ct=${avA.ct}`)
  check("Avatar endpoint has no-store cache",
    avA.headers.get("cache-control")?.includes("no-store"),
    `CC=${avA.headers.get("cache-control")}`)
  check("Avatar endpoint serves image A bytes", avA.text.includes("AAAA"),
    "Content does not contain 'AAAA' marker")

  // next/image optimizer works
  const imgOptA = await req("GET", `/_next/image?url=${encodeURIComponent(displayUrl)}&w=64&q=75`, { headers: auth })
  check("next/image optimizer returns 200", imgOptA.status === 200, `status=${imgOptA.status}`)
  check("next/image has must-revalidate",
    imgOptA.headers.get("cache-control")?.includes("must-revalidate"),
    `CC=${imgOptA.headers.get("cache-control")}`)

  // ── Phase 2: Replace with avatar B ───────────────────────────────────
  console.log("\n=== Phase 2: Replace with blue avatar (B) ===")
  const imgB = mkJPEG("BBBB")
  const upB = await req("POST", "/api/files/avatar", {
    headers: { ...auth, "Content-Type": "multipart/form-data; boundary=----TestBoundary" },
    body: mkMultipart(imgB),
  })
  check("Upload B returns 200", upB.status === 200, `status=${upB.status}`)
  const idB = upB.body?.avatarId
  check("Upload B returns different avatarId", idB !== idA,
    `idA=${idA} idB=${idB}`)
  console.log(`  New GridFS ID: ${idB}`)

  // Save via PATCH profile
  const patchB = await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", avatar: idB }),
  })
  check("PATCH profile with B succeeds", patchB.status === 200,
    `status=${patchB.status} body=${JSON.stringify(patchB.body)}`)
  check("Saved avatar is now B's ID", patchB.body?.user?.avatar === idB,
    `expected ${idB}, got ${patchB.body?.user?.avatar}`)

  // auth/me still returns display URL
  const meB = await req("GET", "/api/auth/me", { headers: auth })
  check("auth/me still returns display URL", meB.body?.user?.avatar === displayUrl,
    `got ${meB.body?.user?.avatar}`)

  // CRITICAL: Avatar endpoint serves B, NOT A
  const avB = await req("GET", displayUrl, { headers: auth })
  check("Avatar endpoint returns 200 after replace", avB.status === 200, `status=${avB.status}`)
  check("Avatar endpoint serves image B bytes", avB.text.includes("BBBB"),
    "Does not contain 'BBBB' — stale image served!")
  check("Avatar endpoint does NOT serve old image A", !avB.text.includes("AAAA"),
    "Still contains 'AAAA' — old image leaked!")

  // next/image optimizer also serves fresh content
  const imgOptB = await req("GET", `/_next/image?url=${encodeURIComponent(displayUrl)}&w=64&q=75`, { headers: auth })
  check("next/image returns 200 after replace", imgOptB.status === 200, `status=${imgOptB.status}`)

  // ── Phase 3: Remove avatar ───────────────────────────────────────────
  console.log("\n=== Phase 3: Remove avatar ===")
  const del = await req("DELETE", "/api/files/avatar", { headers: auth })
  check("Delete returns 200", del.status === 200, JSON.stringify(del.body))

  // Save removal
  const patchDel = await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", avatar: null }),
  })
  check("PATCH with null succeeds", patchDel.status === 200, JSON.stringify(patchDel.body))
  check("PATCH response has null avatar", patchDel.body?.user?.avatar === null,
    `got ${patchDel.body?.user?.avatar}`)

  // auth/me is null
  const meDel = await req("GET", "/api/auth/me", { headers: auth })
  check("auth/me shows null after removal", meDel.body?.user?.avatar === null,
    `got ${meDel.body?.user?.avatar}`)

  // Avatar endpoint returns transparent placeholder
  const avDel = await req("GET", displayUrl, { headers: auth })
  check("Avatar endpoint returns 200 after delete", avDel.status === 200, `status=${avDel.status}`)
  check("Avatar endpoint returns PNG placeholder", avDel.ct === "image/png",
    `expected image/png, got ${avDel.ct}`)

  console.log(`\n${"=".repeat(50)}`)
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1) })
