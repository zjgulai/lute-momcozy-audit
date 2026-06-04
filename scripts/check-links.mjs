import fs from "node:fs";
import path from "node:path";

const root = path.resolve("_site");
const pages = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(candidate);
    else if (candidate.endsWith(".html")) pages.push(candidate);
  }
}
walk(root);
for (const page of pages) {
  const html = fs.readFileSync(page, "utf8");
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:|#)/.test(href)) continue;
    const clean = href.split(/[?#]/)[0];
    const target = clean.startsWith("/") ? path.join(root, clean) : path.join(path.dirname(page), clean);
    const candidates = [target, `${target}.html`, path.join(target, "index.html")];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) {
      throw new Error(`${path.relative(root, page)}: broken link ${href}`);
    }
  }
}
console.log(`checked links in ${pages.length} pages`);

