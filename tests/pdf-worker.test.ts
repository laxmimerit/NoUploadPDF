import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdfError } from "../src/lib/pdf-engine/errors";
import type { PdfInput, PdfJob, PdfReply } from "../src/lib/pdf-engine/protocol";
import { tools } from "../src/lib/tools";
import { brokenFixtures, readFixture, validFixtures } from "./fixtures";

describe("PDF worker jobs", () => {
  let replies: PdfReply[];
  let dispatch: (event: { data: PdfJob }) => Promise<void>;

  function job(files: PdfInput[], id = "fixture-job", tool = "merge-pdf"): PdfJob {
    return { type: "job", id, tool, files, options: {} };
  }

  function expectError(id: string, code: ConstructorParameters<typeof PdfError>[0]) {
    expect(replies.filter((reply) => reply.id === id && reply.type !== "progress")).toEqual([
      { type: "error", id, code, message: new PdfError(code).message },
    ]);
  }

  beforeEach(async () => {
    replies = [];
    vi.resetModules();
    // Run our real handler and validator; replace only the host's worker message port.
    vi.stubGlobal("onmessage", null);
    vi.stubGlobal("postMessage", (reply: PdfReply) => replies.push(structuredClone(reply)));
    await import("../src/lib/pdf-engine/worker");
    dispatch = Reflect.get(globalThis, "onmessage") as typeof dispatch;
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each(validFixtures)("validates $name and reports that processing is not built", async ({ name }) => {
    const request = job([await readFixture(name)]);
    await dispatch({ data: request });
    expect(replies.filter((reply) => reply.type === "progress")).toEqual([
      { type: "progress", id: request.id, value: 0, message: "Checking your PDFs…" },
      { type: "progress", id: request.id, value: 20, message: "PDFs checked on your device." },
    ]);
    expectError(request.id, "not-built");
    expect(request.files).toEqual([]);
  });

  it.each(brokenFixtures)("rejects $name with $code and permits a valid retry", async ({ name, code }) => {
    const request = job([await readFixture(name)]);
    await dispatch({ data: request });
    expectError(request.id, code);
    expect(request.files).toEqual([]);

    await dispatch({ data: job([await readFixture("invoice.pdf")], "retry") });
    expectError("retry", "not-built");
  });

  it("keeps every registered tool unavailable until an operation exists", async () => {
    for (const tool of tools) {
      await dispatch({ data: job([await readFixture("invoice.pdf")], tool.slug, tool.slug) });
      expectError(tool.slug, "not-built");
    }
  });

  it("rejects an empty selection without progress", async () => {
    await dispatch({ data: job([]) });
    expect(replies).toHaveLength(1);
    expectError("fixture-job", "empty");
  });

  it("checks every file and stops at a broken file in a batch", async () => {
    const request = job([
      await readFixture("invoice.pdf"),
      await readFixture("damaged.pdf"),
      await readFixture("report.pdf"),
    ]);
    await dispatch({ data: request });
    expectError(request.id, "damaged");
    expect(replies.filter((reply) => reply.type === "progress").map((reply) => reply.value)).toEqual([0, 7]);
    expect(request.files).toEqual([]);
  });

  it("rejects an overlapping job and accepts another after the first finishes", async () => {
    const first = job([await readFixture("report.pdf")], "first");
    const second = job([await readFixture("invoice.pdf")], "second");
    const pending = dispatch({ data: first });
    await dispatch({ data: second });
    expectError("second", "busy");
    await pending;
    expectError("first", "not-built");
    await dispatch({ data: job([await readFixture("invoice.pdf")], "third") });
    expectError("third", "not-built");
  });

  it("ignores messages that are not jobs", async () => {
    await dispatch({ data: { type: "unknown" } as unknown as PdfJob });
    expect(replies).toEqual([]);
  });
});
