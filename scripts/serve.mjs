import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = path.resolve("_site");
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};

const securityHeaders = {
  "content-security-policy": "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none';",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "cache-control": "no-store, no-cache"
};

function send(response, status, file) {
  response.writeHead(status, {
    "content-type": mime[path.extname(file)] || "application/octet-stream",
    ...securityHeaders
  });
  const stream = fs.createReadStream(file);
  stream.pipe(response);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const firstSegment = url.pathname.split("/").filter(Boolean)[0] || "";
  if (
    firstSegment === "data" ||
    firstSegment === "reports" ||
    /\.(?:json|csv|md|bak|log|sh|env)$/i.test(url.pathname)
  ) {
    return send(response, 404, path.join(root, "404.html"));
  }
  let relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!relative) relative = "index.html";
  const candidates = [
    path.join(root, relative),
    path.join(root, `${relative}.html`),
    path.join(root, relative, "index.html")
  ];
  const file = candidates.find((candidate) => candidate.startsWith(root) && fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return file ? send(response, 200, file) : send(response, 404, path.join(root, "404.html"));
});
server.listen(8080);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
