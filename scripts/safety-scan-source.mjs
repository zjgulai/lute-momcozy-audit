import fs from "node:fs";
import path from "node:path";

const roots = ["src", "docs"];
const forbidden = [
  [/\/Users\//i, "private filesystem path"],
  [/(?:\d{1,3}\.){3}\d{1,3}/, "server address"],
  [/(?:\$|¥|€|£)\s?\d/, "monetary amount"],
  [/\b(?:ROI|AOV|monthly_revenue|overall_cvr|real[-_ ]?kpi)\b/i, "private business metric"],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
  [/(?<!\w)\/data\/(?!\w)/, "data endpoint path"]
];

function files(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const candidate = path.join(directory, entry.name);
    return entry.isDirectory() ? files(candidate) : [candidate];
  });
}

for (const file of roots.flatMap(files)) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const [pattern, label] of forbidden) {
    if (pattern.test(content)) {
      throw new Error(`${file}: forbidden ${label}`);
    }
  }
}

console.log("public source inputs passed safety scan");
