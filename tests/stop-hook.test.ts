import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const configPath = resolve(".codex/hooks.json");
const scriptPath = resolve(".codex/hooks/unit-tests.mjs");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const handler = config.hooks.Stop[0].hooks[0];

describe("project Stop unit-test hook", () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "nouploadpdf stop hook "));
    mkdirSync(join(directory, ".codex/hooks"), { recursive: true });
    mkdirSync(join(directory, "nested"));
    copyFileSync(scriptPath, join(directory, ".codex/hooks/unit-tests.mjs"));
    writeFileSync(join(directory, "package.json"), JSON.stringify({
      scripts: { "test:related": "node --test unit.test.cjs" },
    }));
    const initialized = spawnSync("git", ["init", "-q", directory], { encoding: "utf8" });
    expect(initialized.status).toBe(0);
  });

  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  function fixture(passes: boolean) {
    writeFileSync(join(directory, "unit.test.cjs"), [
      'const { test } = require("node:test");',
      'const { strict: assert } = require("node:assert");',
      'require("node:fs").appendFileSync("runs.txt", "run\\n");',
      `test("hook fixture", () => assert.equal(1, ${passes ? 1 : 2}));`,
    ].join("\n"));
  }

  function stop(active = false, turn = "fixture-turn") {
    const result = spawnSync(handler.command, {
      shell: true,
      cwd: join(directory, "nested"),
      encoding: "utf8",
      input: JSON.stringify({ hook_event_name: "Stop", turn_id: turn, stop_hook_active: active }),
      timeout: 15_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    return JSON.parse(result.stdout);
  }

  it("allows passing related tests, including when Codex starts in a subdirectory with spaces", () => {
    fixture(true);
    expect(stop()).toEqual({});
    expect(readFileSync(join(directory, "runs.txt"), "utf8")).toBe("run\n");
  });

  it("returns a blocking decision with failing unit-test output", () => {
    fixture(false);
    const result = stop();
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("related unit tests failed");
    expect(result.reason).toContain("hook fixture");
    expect(result.reason).toContain("keep the task unfinished");
  });

  it("skips tests on the continuation and checks again on the next turn", () => {
    fixture(false);
    expect(stop().decision).toBe("block");
    expect(stop(true)).toEqual({});
    expect(stop(true)).toEqual({});
    expect(readFileSync(join(directory, "runs.txt"), "utf8")).toBe("run\n");
    expect(stop(false, "next-turn").decision).toBe("block");
    expect(readFileSync(join(directory, "runs.txt"), "utf8")).toBe("run\nrun\n");
  });

  it("passes without running tests when no code changed", () => {
    expect(stop()).toEqual({});
  });

  it("blocks when npm cannot run the related tests", () => {
    fixture(true);
    writeFileSync(join(directory, "package.json"), "{}");
    expect(stop().decision).toBe("block");
    expect(stop(true)).toEqual({});
  });
});
