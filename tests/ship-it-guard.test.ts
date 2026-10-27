import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const guard = resolve(".agents/skills/ship-it/scripts/check-secrets.sh");
const allowed = ["scripts/generate-test-fixtures.mjs", "tests/pdf-errors.test.ts"];
// Assemble fictional scanner examples so this test file does not itself contain a matching credential.
const quoted = ["fixturePassword", " = ", JSON.stringify("fictional-example"), ";"].join("");
const unquoted = ["FIXTURE_PASSWORD", "=fictional-example"].join("");
const otherRules = [
  ["private-key material", ["-----BEGIN ", "PRIVATE KEY", "-----"].join("")],
  ["coauthor line", ["Co-Authored", "-By: Fixture"].join("")],
  ["token format", "gh" + "p_" + "x".repeat(24)],
  ["authorization credential", ["Bearer", "fictional-example"].join(" ")],
];

describe("ship-it guard's exact-path literal-credential exceptions", () => {
  let directory: string;
  let environment: NodeJS.ProcessEnv;

  function git(...args: string[]) {
    const result = spawnSync("git", args, { cwd: directory, env: environment, encoding: "utf8" });
    // Keep Git diagnostics and identity values out of test output.
    if (result.status !== 0) throw new Error("Guard test repository setup failed.");
    return result.stdout.trim();
  }

  function stage(path: string, content: string) {
    const target = join(directory, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    git("add", "--", path);
  }

  function check() {
    return spawnSync("bash", [guard], { cwd: directory, env: environment, encoding: "utf8" });
  }

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "nouploadpdf-guard-"));
    environment = { ...process.env };
    for (const key of Object.keys(environment)) {
      if (key.startsWith("GIT_")) delete environment[key];
    }
    const email = ["fixture", "example.invalid"].join("@");
    Object.assign(environment, {
      GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_AUTHOR_NAME: "Fixture", GIT_COMMITTER_NAME: "Fixture",
      GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_EMAIL: email,
    });
    git("init", "-q", "-b", "codex/guard-test");
    git("config", "--local", "user.email", email);
    git("commit", "-q", "--allow-empty", "-m", "Guard baseline");
    git("update-ref", "refs/remotes/origin/main", git("rev-parse", "HEAD"));
  });

  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  it.each(allowed)("allows fictional literal credentials in %s, staged and committed", (path) => {
    stage(path, `${quoted}\n${unquoted}\n`);
    expect(check().status).toBe(0);
    git("commit", "-q", "-m", "Add fictional fixture content");
    expect(check().status).toBe(0);
  });

  it.each([
    "src/config.ts", "nested/scripts/generate-test-fixtures.mjs", "tests/pdf-errors.test.ts.bak",
  ])("rejects literal credentials in %s", (path) => {
    stage(path, quoted);
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("literal credential in staged changes");
  });

  it.each(allowed.flatMap((path) => otherRules.map(([category, content]) => ({ path, category, content }))))(
    "still rejects $category in $path",
    ({ path, category, content }) => {
      stage(path, content);
      const result = check();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`${category} in staged changes`);
    },
  );

  it("checks identical content copied from an exempt path to another file", () => {
    stage(allowed[0], quoted);
    stage("zzz-copy.txt", quoted);
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("literal credential in staged changes");
  });

  it("still checks literal credentials in commit messages", () => {
    git("commit", "-q", "--allow-empty", "-m", quoted);
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("literal credential in branch commit");
  });
});
