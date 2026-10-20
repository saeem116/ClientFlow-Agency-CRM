#!/usr/bin/env node
const BASE = "http://localhost:3000"

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

  const txtContent = "Hello ClientFlow file management test!"
  const boundary = "----TxtBoundary"
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\n`
  const body = Buffer.concat([Buffer.from(header), Buffer.from(txtContent), Buffer.from(`\r\n--${boundary}--\r\n`)])
  const upload = await req("POST", "/api/files", {
    headers: { ...auth, "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body,
  })
  console.log("Upload response:", JSON.stringify(upload.body, null, 2))

  const list = await req("GET", "/api/files", { headers: auth })
  console.log("List response:", JSON.stringify(list.body, null, 2))

  if (list.body?.files?.length) {
    const f = list.body.files[0]
    console.log("\nTrying download with fileId:", f.fileId)
    const dl = await req("GET", `/api/files/${f.fileId}`, { headers: auth })
    console.log("Download:", dl.status, dl.headers.get("content-type"), "len:", dl.text.length, "match:", dl.text === txtContent)
  }
}

main().catch(e => console.error("ERROR:", e))