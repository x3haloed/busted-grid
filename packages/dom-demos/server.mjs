import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { extname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8"
}

const repoRoot = join(__dirname, "..", "..")

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost")
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname
    const filePath = resolvePath(pathname)
    if (!filePath) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
      res.end("Not found")
      return
    }
    const data = await readFile(filePath)
    const type = contentTypes[extname(filePath)] ?? "application/octet-stream"
    res.writeHead(200, { "Content-Type": type })
    res.end(data)
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
    res.end("Not found")
  }
})

server.listen(5174, () => {
  console.log("DOM demo running at http://localhost:5174")
})

function resolvePath(pathname) {
  if (pathname === "/favicon.ico") {
    return null
  }
  if (pathname.startsWith("/runtime/")) {
    return join(repoRoot, "packages", pathname.slice(1))
  }
  if (pathname.startsWith("/dom/")) {
    return join(repoRoot, "packages", pathname.slice(1))
  }
  if (pathname.startsWith("/keyboard/")) {
    return join(repoRoot, "packages", pathname.slice(1))
  }
  if (pathname.startsWith("/dom-demos/")) {
    return join(repoRoot, "packages", pathname.slice(1))
  }
  return join(__dirname, pathname)
}
