import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionsDir = path.join(__dirname, "sessions");

export default function () {
  const files = fs.readdirSync(sessionsDir)
    .filter((f) => f.endsWith(".json"))
    .sort(); // ISO date filenames sort lexicographically = chronologically

  const sessions = files.map((file) =>
    JSON.parse(fs.readFileSync(path.join(sessionsDir, file), "utf8"))
  );

  return sessions.map((s, i) => {
    const isAutomated = s.collectedBy.includes("collect.mjs");
    const prevAutomated = i > 0 && sessions[i - 1].collectedBy.includes("collect.mjs");
    return {
      ...s,
      isAutomated,
      methodologyBreak: i > 0 && isAutomated !== prevAutomated
    };
  });
}
