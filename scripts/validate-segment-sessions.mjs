import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const schema = JSON.parse(fs.readFileSync("config/session.schema.json", "utf8"));
const validate = new Ajv2020({strict: false}).compile(schema);
const sessionsDir = "src/_data/segment-sessions";

if (!fs.existsSync(sessionsDir)) {
  console.log(`validated 0 segment session file(s); ${sessionsDir} does not exist yet`);
  process.exit(0);
}

const files = fs.readdirSync(sessionsDir).filter((file) => file.endsWith(".json")).sort();
let errors = 0;

for (const file of files) {
  const filePath = path.join(sessionsDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const fileErrors = [];

  if (!validate(data)) {
    fileErrors.push(`schema violation ${JSON.stringify(validate.errors)}`);
  }

  if (!/^session-\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(data.sessionId || "")) {
    fileErrors.push("segment sessionId must include a date plus a public label suffix");
  }

  const expectedFile = `${String(data.sessionId || "").replace(/^session-/, "")}.json`;
  if (file !== expectedFile) {
    fileErrors.push(`filename must match sessionId: expected ${expectedFile}`);
  }

  if (!String(data.methodologyVersion || "").startsWith("collector-v3-segmented-")) {
    fileErrors.push("methodologyVersion must start with collector-v3-segmented-");
  }

  for (const route of data.routes || []) {
    if (!route.segment?.id) {
      fileErrors.push(`route ${route.routeId || "(unknown)"} missing segment metadata`);
    }
  }

  for (const observation of data.observations || []) {
    if (!observation.segment?.id) {
      fileErrors.push(`observation ${observation.routeId || "(unknown)"} ${observation.viewport || "(unknown)"} missing segment metadata`);
    }
  }

  const serialized = JSON.stringify(data).toLowerCase();
  const rawDataEndpointMarker = `/${"data"}/`;
  const privateUsersPathMarker = `/${"users"}/`;
  for (const forbidden of [
    "token",
    "password",
    "secret",
    "-----begin",
    privateUsersPathMarker,
    rawDataEndpointMarker
  ]) {
    if (serialized.includes(forbidden)) {
      fileErrors.push(`contains forbidden sensitive marker ${forbidden}`);
    }
  }

  if (fileErrors.length > 0) {
    console.error(`${file}: ${fileErrors.join("; ")}`);
    errors++;
  }
}

if (errors > 0) process.exit(1);
console.log(`validated ${files.length} segment session file(s)`);
