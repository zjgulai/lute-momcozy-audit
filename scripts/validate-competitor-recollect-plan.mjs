import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("src/_data/public-cross-audit.json", "utf-8"));

const validStates = new Set(["todo", "pending", "in_progress", "blocked", "done"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

const competitorMatrix = data.competitorMatrix || [];
assert(Array.isArray(competitorMatrix), "competitorMatrix must be an array");

for (const item of competitorMatrix) {
  const status = item.recollectStatus;
  if (status == null) continue;

  if (typeof status === "string") {
    continue;
  }

  assert(typeof status === "object", "competitorMatrix item recollectStatus must be a string, object, or null");
  assert(typeof status.state === "string" && validStates.has(status.state), `invalid recollectStatus.state: ${status.state}`);
  assert(typeof status.summary === "string" && status.summary.trim().length > 0, `recollectStatus summary is required for object state in dimension: ${item.dimension}`);
  if (status.dueBy != null) {
    assert(typeof status.dueBy === "string" && datePattern.test(status.dueBy), `invalid recollectStatus.dueBy format in dimension ${item.dimension}: ${status.dueBy}`);
  }
  if (status.actions != null) {
    assert(Array.isArray(status.actions), `recollectStatus.actions must be an array in dimension: ${item.dimension}`);
    assert(status.actions.every((itemValue) => typeof itemValue === "string" && itemValue.trim().length > 0), `recollectStatus.actions must contain non-empty strings in dimension: ${item.dimension}`);
  }
  if (status.evidence != null) {
    assert(Array.isArray(status.evidence), `recollectStatus.evidence must be an array in dimension: ${item.dimension}`);
    assert(status.evidence.every((itemValue) => typeof itemValue === "string" && itemValue.trim().length > 0), `recollectStatus.evidence must contain non-empty strings in dimension: ${item.dimension}`);
  }
}

const plan = data.competitorRecollectPlan;
if (!plan) {
  fail("competitorRecollectPlan is required for this report version");
}

const tasks = plan.tasks || [];
assert(Array.isArray(tasks), "competitorRecollectPlan.tasks must be an array");

const taskIds = new Set();
for (const task of tasks) {
  assert(task && typeof task === "object", "Each task must be an object");
  assert(typeof task.taskId === "string" && task.taskId.trim().length > 0, "Each task must have a non-empty taskId");
  assert(!taskIds.has(task.taskId), `duplicate taskId: ${task.taskId}`);
  taskIds.add(task.taskId);
  assert(typeof task.title === "string" && task.title.trim().length > 0, `task title is required for ${task.taskId}`);
  assert(typeof task.owner === "string" && task.owner.trim().length > 0, `task owner is required for ${task.taskId}`);
  assert(typeof task.state === "string" && validStates.has(task.state), `invalid task state for ${task.taskId}: ${task.state}`);
  if (task.dueBy != null) {
    assert(typeof task.dueBy === "string" && datePattern.test(task.dueBy), `invalid task dueBy format for ${task.taskId}: ${task.dueBy}`);
  }
  if (task.deliverables != null) {
    assert(Array.isArray(task.deliverables), `task deliverables must be an array for ${task.taskId}`);
    assert(task.deliverables.every((itemValue) => typeof itemValue === "string" && itemValue.trim().length > 0), `task deliverables must contain non-empty strings for ${task.taskId}`);
  }
}

if (plan.commands != null) {
  assert(Array.isArray(plan.commands), "competitorRecollectPlan.commands must be an array");
  assert(plan.commands.every((command) => typeof command === "string" && command.trim().length > 0), "competitorRecollectPlan.commands must contain non-empty strings");
}

console.log(`public-cross-audit competitor recollect plan validated for ${tasks.length} task(s)`);
