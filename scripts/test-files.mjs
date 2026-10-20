#!/usr/bin/env node
/**
 * General file upload/download/delete flow test
 * Usage: cd E:/Agency_CRM/clientflow && node scripts/test-files.mjs
 */
const BASE = "http://localhost:3000"

async function req(method, path, opts = {}) {
  const fetchOpts = { method, redirect: "manual", headers: { ...opts.headers } }
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
  // 1. Sign in
  const login = await req("POST", "/api/auth/signin", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@demo.com", password: "password123" }),
  })
  if (login.status !== 200 || !login.body?.user) {
    console.log("FATAL: sign-in failed", login.status, login.body)
    process.exit(1)
  }
  const cookie = login.headers.get("set-cookie").match(/^session=([^;]+)/)[1]
  const authHeaders = { Cookie: `session=${cookie}` }
  console.log("Signed in:", login.body.user.email)

  // 2. Upload a text file
  const fileContent = "Hello, this is a test file for ClientFlow upload."
  const boundary = "----TestBoundary123"
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\n`
  const footer = `\r\n--${boundary}--\r\n`
  const body = Buffer.concat([
    Buffer.from(header, "utf8"),
    Buffer.from(fileContent, "utf8"),
    Buffer.from(footer, "utf8"),
  ])
  const upload = await req("POST", "/api/files", {
    headers: { ...authHeaders, "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body,
  })
  console.log("Upload status:", upload.status, JSON.stringify(upload.body))
  if (upload.status !== 200) {
    console.log("FATAL: upload failed")
    process.exit(1)
  }
  const fileId = upload.body.fileId
  console.log("File ID:", fileId)

  // 3. List files
  const list = await req("GET", "/api/files", { headers: authHeaders })
  console.log("List status:", list.status, "count:", list.body?.files?.length)
  if (list.body?.files?.length) {
    console.log("  first file:", JSON.stringify(list.body.files[0]))
  }

  // 4. Download
  const dl = await req("GET", `/api/files/${fileId}`, { headers: authHeaders })
  console.log("Download status:", dl.status, "content-type:", dl.headers.get("content-type"), "matches:", dl.text === fileContent)

  // 5. Delete
  const del = await req("DELETE", `/api/files?fileId=${encodeURIComponent(fileId)}`, { headers: authHeaders })
  console.log("Delete status:", del.status, JSON.stringify(del.body))

  // 6. Verify gone
  const dl2 = await req("GET", `/api/files/${fileId}`, { headers: authHeaders })
  console.log("Re-download status:", dl2.status, "(expect 404)")

  // 7. Test unsupported type
  const badBoundary = "----BadBoundary"
  const badHeader = `--${badBoundary}\r\nContent-Disposition: form-data; name="file"; filename="evil.exe"\r\nContent-Type: application/x-executable\r\n\r\n`
  const badFooter = `\r\n--${badBoundary}--\r\n`
  const badBody = Buffer.concat([Buffer.from(badHeader, "utf8"), Buffer.from("malware"), Buffer.from(badFooter, "utf8")])
  const bad = await req("POST", "/api/files", {
    headers: { ...authHeaders, "Content-Type": `multipart/form-data; boundary=${badBoundary}` },
    body: badBody,
  })
  console.log("Unsupported type status:", bad.status, JSON.stringify(bad.body))

  // 8. Test oversized file
  const bigBoundary = "----BigBoundary"
  const bigHeader = `--${bigBoundary}\r\nContent-Disposition: form-data; name="file"; filename="big.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
  const bigFooter = `\r\n--${bigBoundary}--\r\n`
  const bigBody = Buffer.concat([Buffer.from(bigHeader, "utf8"), Buffer.alloc(11 * 1024 * 1024), Buffer.from(bigFooter, "utf8")])
  const big = await req("POST", "/api/files", {
    headers: { ...authHeaders, "Content-Type": `multipart/form-data; boundary=${bigBoundary}` },
    body: bigBody,
  })
  console.log("Oversized status:", big.status, JSON.stringify(big.body))

  // 9. Test unauthorized
  const unauth = await req("GET", "/api/files")
  console.log("Unauthorized status:", unauth.status, JSON.stringify(unauth.body))

  console.log("\nAll file tests complete.")
}

main().catch(e => { console.error("ERROR:", e); process.exit(1) })