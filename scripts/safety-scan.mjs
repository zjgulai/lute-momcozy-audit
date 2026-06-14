import fs from "node:fs";
import path from "node:path";

const root = "_site";
const forbidden = [
  [/\/Users\//i, "private filesystem path"],
  [/(?:\d{1,3}\.){3}\d{1,3}/, "server address"],
  [/(?:\$|¥|€|£)\s?\d/, "monetary amount"],
  [/\b(?:ROI|AOV|monthly_revenue|overall_cvr|real[-_ ]?kpi)\b/i, "private business metric"],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
  [/(?<!\w)\/data\/(?!\w)/, "data endpoint path"],
];
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".txt",
  ".xml"
]);

function files(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const candidate = path.join(directory, entry.name);
    return entry.isDirectory() ? files(candidate) : [candidate];
  });
}

for (const file of files(root)) {
  if (!textExtensions.has(path.extname(file))) continue;
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    // binary files (images, fonts) cannot contain text secrets; skip safely
    continue;
  }
  for (const [pattern, label] of forbidden) {
    if (pattern.test(content)) {
      throw new Error(`${file}: forbidden ${label}`);
    }
  }
}
console.log("public build passed safety scan");
