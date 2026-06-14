import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const schema = JSON.parse(fs.readFileSync("config/session.schema.json", "utf8"));
const validate = new Ajv2020({strict: false}).compile(schema);
const sessionsDir = "src/_data/sessions";
const files = fs.readdirSync(sessionsDir).filter((f) => f.endsWith(".json")).sort();

if (files.length === 0) {
  console.error("No session files found in", sessionsDir);
  process.exit(1);
}

let errors = 0;
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(sessionsDir, file), "utf8"));
  if (!validate(data)) {
    console.error(`${file}: schema violation`, validate.errors);
    errors++;
  }
}

if (errors > 0) process.exit(1);
console.log(`validated ${files.length} session file(s)`);
