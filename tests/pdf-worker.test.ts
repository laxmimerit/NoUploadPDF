import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdfError } from "../src/lib/pdf-engine/errors";
import type { PdfInput, PdfJob, PdfReply } from "../src/lib/pdf-engine/protocol";
import { resultOutputs } from "../src/lib/pdf-engine/protocol";
import { PDFDocument } from "@cantoo/pdf-lib";
import { tools } from "../src/lib/tools";
import { brokenFixtures, readFixture, validFixtures } from "./fixtures";

describe("PDF worker jobs", () => {
  let replies: PdfReply[];
  let dispatch: (event: { data: PdfJob }) => Promise<void>;
  let transferred: Transferable[][];

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
    transferred = [];
    vi.resetModules();
    // Run our real handler and validator; replace only the host's worker message port.
    vi.stubGlobal("onmessage", null);
    vi.stubGlobal("postMessage", (reply: PdfReply, transfer: Transferable[] = []) => {
      replies.push(structuredClone(reply));
      if (reply.type === "result") transferred.push(transfer);
    });
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

  it("keeps unfinished tools unavailable", async () => {
    for (const tool of tools.filter((entry) => !entry.available)) {
      await dispatch({ data: job([await readFixture("invoice.pdf")], tool.slug, tool.slug) });
      expectError(tool.slug, "not-built");
    }
  });

  it.each(["split-pdf", "extract-pages"])("runs %s with real fixture bytes and retries invalid options", async (tool) => {
    const invalid = { ...job([await readFixture("report.pdf")], "invalid", tool), options: { ranges: "1-3, 0" } };
    await dispatch({ data: invalid });
    expect(replies.find((reply) => reply.type === "error" && reply.id === "invalid")).toMatchObject({
      code: "invalid-options", message: expect.stringContaining("Part 2 (\u201c0\u201d): page numbers start at 1."),
    });
    const request = { ...job([await readFixture("report.pdf")], "success", tool), options: { ranges: "1-3, 7, 10-12" } };
    await dispatch({ data: request });
    const reply = replies.find((entry) => entry.type === "result" && entry.id === "success");
    expect(reply?.type).toBe("result");
    if (reply?.type !== "result") throw new Error("Expected output");
    const outputs = resultOutputs(reply.result);
    const counts = await Promise.all(outputs.map(async (output) => (await PDFDocument.load(output.data)).getPageCount()));
    expect(counts).toEqual(tool === "split-pdf" ? [3, 1, 3] : [7]);
    expect(transferred).toHaveLength(1);
    expect(transferred[0]).toHaveLength(outputs.length);
    expect(transferred[0].every((buffer) => buffer instanceof ArrayBuffer)).toBe(true);
    expect(request.files).toEqual([]);
    expect(replies.filter((entry) => entry.id === "success" && entry.type === "progress").length).toBeGreaterThan(2);
  });

  it.each(["split-pdf", "extract-pages"])("rejects broken inputs for %s and allows retry", async (tool) => {
    for (const { name, code } of brokenFixtures) {
      await dispatch({ data: { ...job([await readFixture(name)], name, tool), options: { ranges: "1" } } });
      expectError(name, code);
    }
    await dispatch({ data: { ...job([await readFixture("invoice.pdf")], "retry", tool), options: { ranges: "1" } } });
    expect(replies.find((entry) => entry.id === "retry" && entry.type === "result")).toBeDefined();
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
