import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const event = JSON.parse(await new Promise((resolve, reject) => {
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { input += chunk; });
  process.stdin.on("end", () => resolve(input));
  process.stdin.on("error", reject);
}));

// Codex sets this after a Stop hook continues the turn. Never block that continuation again.
if (event.stop_hook_active === true) {
  process.stdout.write("{}\n");
} else {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const git = (args) => spawnSync("git", args, { cwd: root, encoding: "utf8" }).stdout ?? "";
  // Only the unit tests related to this turn's changed files; CI runs the full suite.
  const changed = [...new Set([...git(["diff", "--name-only", "HEAD"]).split("\n"),
    ...git(["ls-files", "--others", "--exclude-standard"]).split("\n")])]
    .filter((file) => /\.(ts|tsx|mts|cts|js|mjs|cjs)$/.test(file) && !file.startsWith(".codex/"));
  const result = changed.length === 0 ? { status: 0 } : spawnSync("npm",
    ["run", "--silent", "test:related", "--", ...changed], {
      cwd: root,
      encoding: "utf8",
      timeout: 240_000,
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: "1" },
    });

  if (result.status === 0 && !result.error) {
    process.stdout.write("{}\n");
  } else {
    const output = [result.stdout, result.stderr, result.error?.message].filter(Boolean).join("\n");
    const reason = [
      "The related unit tests failed or could not finish. Fix the failure and rerun those tests before finishing.",
      "This hook blocks only once per turn. If tests still fail, report that and keep the task unfinished.",
      output.slice(-12_000),
    ].join("\n\n");
    process.stdout.write(`${JSON.stringify({ decision: "block", reason })}\n`);
  }
}
