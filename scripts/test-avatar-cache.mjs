#!/usr/bin/env node
/**
 * End-to-end avatar flow test — traces every layer:
 *   DB state → API responses → next/image → browser cache headers
 *
 * Specifically reproduces the bug: after deleting an old avatar and uploading
 * a new one, the browser shows the old image because the URL never changes
 * and the server returns long-lived cache headers.
 */
const BASE = "http://localhost:3000"

const JPEG_A = Buffer.from(
  "ffd8ffe000104a46494600010100000100010000ffc0000b080001000101011100" +
  "ffc4001f00000102030405060708090a0bffc400b51000020103030204030505040400017dff" +
  "c0000b080001000101011100ffc4001f00000102030405060708090a" +
  "0bffc400b51000020103030204030505040400017dffda0008010100" +
  "03010101013c003f87ffd9",
  "hex"
)

const JPEG_B = Buffer.from(
  "ffd8ffe1001845786966000049492a00080000000b0000000000000000000000000000" +
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
  const login = await req("POST", "/api/auth/signin", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "avatar-test-user@example.com", password: "password123" }),
  })
  const cookie = login.headers.get("set-cookie").match(/^session=([^;]+)/)[1]
  const auth = { Cookie: `session=${cookie}` }
  const userId = login.body.user.id
  console.log(`  userId: ${userId}`)

  // ── Step 1: Upload avatar A ──────────────────────────────────────────
  const mkBody = (img) => {
    const b = "----B"
    const h = `--${b}\r\nContent-Disposition: form-data; name="file"; filename="a.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
    const f = `\r\n--${b}--\r\n`
    return Buffer.concat([Buffer.from(h), img, Buffer.from(f)])
  }
  const upA = await req("POST", "/api/files/avatar", {
    headers: { ...auth, "Content-Type": "multipart/form-data; boundary=----B" },
    body: mkBody(JPEG_A),
  })
  check("Upload A returns 200", upA.status === 200, JSON.stringify(upA.body))
  const idA = upA.body?.avatarId
  check("Upload A returns avatarId", !!idA, JSON.stringify(upA.body))

  // Save via PATCH profile
  const patch1 = await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", avatar: idA }),
  })
  check("PATCH profile with A", patch1.status === 200, JSON.stringify(patch1.body))

  // Check auth/me
  const me1 = await req("GET", "/api/auth/me", { headers: auth })
  check("auth/me after upload A", me1.body?.user?.avatar !== null, `avatar=${me1.body?.user?.avatar}`)
  const urlA = me1.body?.user?.avatar

  // Check avatar endpoint directly
  const avA = await req("GET", `/api/avatars/${userId}`, { headers: auth })
  check("Avatar endpoint after A", avA.status === 200, `status=${avA.status} ct=${avA.ct}`)
  // Capture cache headers BEFORE we change them
  console.log(`  [INFO] Avatar endpoint Cache-Control after A: ${avA.headers.get("cache-control")}`)
  const bufA = Buffer.from(avA.text)

  // Check next/image optimizer
  const imgA = await req("GET", `/_next/image?url=${encodeURIComponent(urlA)}&w=64&q=75`, { headers: auth })
  check("next/image after A", imgA.status === 200, `status=${imgA.status}`)
  const bufImgA = Buffer.from(imgA.text)
  console.log(`  [INFO] next/image Cache-Control after A: ${imgA.headers.get("cache-control")}`)

  // ── Step 2: Remove avatar A ──────────────────────────────────────────
  const delA = await req("DELETE", "/api/files/avatar", { headers: auth })
  check("Delete avatar A", delA.status === 200, JSON.stringify(delA.body))

  // Save removal
  const patchDel = await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", avatar: null }),
  })
  check("PATCH profile with null", patchDel.status === 200, JSON.stringify(patchDel.body))
  check("PATCH response has null avatar", patchDel.body?.user?.avatar === null, `avatar=${patchDel.body?.user?.avatar}`)

  const me2 = await req("GET", "/api/auth/me", { headers: auth })
  check("auth/me after delete A", me2.body?.user?.avatar === null, `avatar=${me2.body?.user?.avatar}`)

  const avDel = await req("GET", `/api/avatars/${userId}`, { headers: auth })
  check("Avatar endpoint after delete", avDel.status === 200, `status=${avDel.status} ct=${avDel.ct}`)
  check("Avatar endpoint returns placeholder after delete", avDel.ct === "image/png", `ct=${avDel.ct}`)

  // ── Step 3: Upload avatar B (different content) ──────────────────────
  const upB = await req("POST", "/api/files/avatar", {
    headers: { ...auth, "Content-Type": "multipart/form-data; boundary=----B" },
    body: mkBody(JPEG_B),
  })
  check("Upload B returns 200", upB.status === 200, JSON.stringify(upB.body))
  const idB = upB.body?.avatarId
  check("Upload B different from A", idB !== idA, `idA=${idA} idB=${idB}`)

  // Save via PATCH profile
  const patch2 = await req("PATCH", "/api/auth/profile", {
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", avatar: idB }),
  })
  check("PATCH profile with B", patch2.status === 200, JSON.stringify(patch2.body))
  check("PATCH response has non-null avatar", patch2.body?.user?.avatar !== null, `avatar=${patch2.body?.user?.avatar}`)

  // Check auth/me
  const me3 = await req("GET", "/api/auth/me", { headers: auth })
  check("auth/me after upload B", me3.body?.user?.avatar !== null, `avatar=${me3.body?.user?.avatar}`)
  const urlB = me3.body?.user?.avatar
  check("auth/me URL unchanged (userId-based)", urlB === urlA, `urlA=${urlA} urlB=${urlB}`)

  // Check avatar endpoint directly — MUST return B's content
  const avB = await req("GET", `/api/avatars/${userId}`, { headers: auth })
  check("Avatar endpoint after B", avB.status === 200, `status=${avB.status} ct=${avB.ct}`)
  console.log(`  [INFO] Avatar endpoint Cache-Control after B: ${avB.headers.get("cache-control")}`)
  const bufB = Buffer.from(avB.text)

  // CRITICAL: verify the bytes are actually different (B ≠ A)
  const contentMatchesA = bufB.equals(bufA)
  check("Avatar endpoint returns NEW image (not cached old)", !contentMatchesA,
    contentMatchesA ? "BYTES MATCH OLD IMAGE — SERVER CACHE BUG!" : "Different from A ✓")

  // CRITICAL: check cache headers
  const cc = avB.headers.get("cache-control") || ""
  const hasNoStore = cc.includes("no-store") || cc.includes("no-cache") || cc.includes("max-age=0")
  check("Avatar endpoint has freshness headers (no-store/no-cache)", hasNoStore, `Cache-Control: ${cc}`)

  // Check next/image optimizer — the browser's actual rendering path
  const imgB = await req("GET", `/_next/image?url=${encodeURIComponent(urlB)}&w=64&q=75`, { headers: auth })
  check("next/image after B", imgB.status === 200, `status=${imgB.status}`)
  console.log(`  [INFO] next/image Cache-Control after B: ${imgB.headers.get("cache-control")}`)
  // next/image may re-encode JPEGs (different compressor output), so byte-equality
  // is not a reliable cache indicator. Instead we check the Cache-Control header
  // which tells us whether the browser will revalidate on every load.
  const imgCC = imgB.headers.get("cache-control") || ""
  const imgRevalidates = imgCC.includes("must-revalidate") || imgCC.includes("no-store")
  check("next/image has revalidation headers", imgRevalidates,
    `Cache-Control: ${imgCC}`)

  // ── Summary ──────────────────────────────────────────────────────────
  console.log(`\n  Results: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1) })