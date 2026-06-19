import fs from "node:fs";
import path from "node:path";

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, {recursive: true});
}

export function copyFile(source, target) {
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

export function copyDir(source, target) {
  ensureDir(target);
  for (const entry of fs.readdirSync(source, {withFileTypes: true})) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) copyDir(sourcePath, targetPath);
    else copyFile(sourcePath, targetPath);
  }
}

export function cleanOutput(outputDir) {
  fs.rmSync(outputDir, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100
  });
  ensureDir(outputDir);
}

export function latestSession(sessionsDir, readJsonFn = readJson) {
  const sessions = fs.readdirSync(sessionsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJsonFn(path.join(sessionsDir, file)))
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  if (sessions.length === 0) throw new Error("No session files found");
  return sessions[sessions.length - 1];
}

export function allSessions(sessionsDir, readJsonFn = readJson) {
  return fs.readdirSync(sessionsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJsonFn(path.join(sessionsDir, file)))
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
    .reverse(); // newest first
}
