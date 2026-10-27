import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCanvas, DOMMatrix, Path2D, loadImage } from "@napi-rs/canvas";
import { PDFDocument } from "@cantoo/pdf-lib";
import { PdfError } from "../src/lib/pdf-engine/errors";
import type { PdfInput, PdfJob, PdfReply } from "../src/lib/pdf-engine/protocol";
import { resultOutputs } from "../src/lib/pdf-engine/protocol";
import { tools } from "../src/lib/tools";
import { brokenFixtures, readFixture, validFixtures } from "./fixtures";
import { pageTexts } from "./pdf-output";
import { signature } from "./sign-fixtures";

describe("PDF worker jobs", () => {
  let replies: PdfReply[];
  let dispatch: (event: { data: PdfJob }) => Promise<void>;
  let transferred: Transferable[][];

  function job(files: PdfInput[], id = "fixture-job", tool = "unfinished-tool"): PdfJob {
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

    await dispatch({ data: job([
      await readFixture("invoice.pdf"), await readFixture("report.pdf"),
    ], "retry", "merge-pdf") });
    const result = replies.find((reply) => reply.id === "retry" && reply.type === "result");
    expect(result?.type).toBe("result");
    if (result?.type !== "result") throw new Error("Expected a retry result");
    expect((await PDFDocument.load(resultOutputs(result.result)[0].data)).getPageCount()).toBe(13);
  });

  it("keeps tools without implementations unavailable while other tools await verification", async () => {
    const pending = ["sign-pdf", "images-to-pdf", "pdf-to-images"];
    for (const tool of tools.filter((tool) => !tool.available && !pending.includes(tool.slug))) {
      await dispatch({ data: job([await readFixture("invoice.pdf")], tool.slug, tool.slug) });
      expectError(tool.slug, "not-built");
    }
  });

  it("cleans up a PDF through the job protocol and transfers the result", async () => {
    const source = await readFixture("report.pdf");
    const document = await PDFDocument.load(source.data, { updateMetadata: false });
    const uncompressed = await document.save({ useObjectStreams: false, updateFieldAppearances: false });
    const input = { name: source.name, data: uncompressed.buffer as ArrayBuffer };
    const expected = await pageTexts(input.data.slice(0));
    const request = job([input], "compress", "compress-pdf");
    request.options = { mode: "cleanup" };
    await dispatch({ data: request });
    const reply = replies.find((entry) => entry.id === "compress" && entry.type === "result");
    if (reply?.type !== "result") throw new Error("Expected a compressed result");
    const [output] = resultOutputs(reply.result);
    expect(output.data.byteLength).toBeLessThan(uncompressed.byteLength);
    expect(await pageTexts(output.data.slice(0))).toEqual(expected);
    expect(transferred).toEqual([[output.data]]);
    expect(request.files).toEqual([]);
  });

  it("scans a fictional PDF through the worker and transfers the result", async () => {
    const workerPath = "pdfjs-dist/legacy/build/pdf.worker.mjs";
    vi.stubGlobal("pdfjsWorker", await import(workerPath));
    vi.stubGlobal("Path2D", Path2D);
    vi.stubGlobal("DOMMatrix", DOMMatrix);
    vi.stubGlobal("OffscreenCanvas", class {
      constructor(width: number, height: number) { return createCanvas(width, height); }
    });
    vi.stubGlobal("createImageBitmap", async (blob: Blob) => {
      const image = await loadImage(Buffer.from(await blob.arrayBuffer()));
      return Object.assign(image, { close: () => {} });
    });
    const request = job([await readFixture("scanned.pdf")], "scan", "compress-pdf");
    request.options = { mode: "scan", quality: "smaller" };
    await dispatch({ data: request });
    const reply = replies.find((entry) => entry.id === "scan" && entry.type === "result");
    if (reply?.type !== "result") throw new Error("Expected a scanned result");
    const [output] = resultOutputs(reply.result);
    expect((await PDFDocument.load(output.data)).getPageCount()).toBe(2);
    expect(transferred).toEqual([[output.data]]);
    expect(request.files).toEqual([]);
  });

  it("merges through the job protocol and releases input buffers", async () => {
    const request = job([
      await readFixture("merge-two.pdf"), await readFixture("merge-three.pdf"),
    ], "merge", "merge-pdf");
    await dispatch({ data: request });
    const result = replies.find((reply) => reply.type === "result");
    expect(result?.type).toBe("result");
    if (result?.type !== "result") throw new Error("Expected a merged result");
    const outputs = resultOutputs(result.result);
    expect(outputs).toHaveLength(1);
    expect(outputs[0].name).toBe("merge-two-merged.pdf");
    expect((await PDFDocument.load(outputs[0].data)).getPageCount()).toBe(5);
    expect(transferred).toEqual([[outputs[0].data]]);
    const progress = replies.filter((reply) => reply.type === "progress").map((reply) => reply.value);
    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(100);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
    expect(request.files).toEqual([]);
  });

  it("signs the chosen page, reports recoverable errors, and transfers only the result", async () => {
    for (const { name, code } of brokenFixtures) {
      await dispatch({ data: job([await readFixture(name)], name, "sign-pdf") });
      expectError(name, code);
    }
    const invalid = job([await readFixture("report.pdf")], "invalid-sign", "sign-pdf");
    await dispatch({ data: invalid });
    expect(replies.find((reply) => reply.id === invalid.id && reply.type === "error"))
      .toMatchObject({ code: "invalid-options", message: expect.stringContaining("Draw a signature") });
    const request = job([await readFixture("report.pdf")], "signed", "sign-pdf");
    const sourceText = await pageTexts(request.files[0].data.slice(0));
    request.options = { signature, page: 7, x: 0.1, y: 0.6, width: 0.3, height: 0.1 };
    await dispatch({ data: request });
    const reply = replies.find((entry) => entry.id === "signed" && entry.type === "result");
    if (reply?.type !== "result") throw new Error("Expected signed output");
    const [output] = resultOutputs(reply.result);
    expect(output.name).toBe("report-signed.pdf");
    expect(await pageTexts(output.data.slice(0))).toEqual(sourceText);
    expect(transferred).toEqual([[output.data]]);
    expect(request.files).toEqual([]);
    const progress = replies.flatMap((entry) => entry.id === "signed" && entry.type === "progress" ? [entry.value] : []);
    expect(progress.at(-1)).toBe(100);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
  });

  it("reports a damaged merge input without a partial result", async () => {
    const request = job([
      await readFixture("invoice.pdf"), await readFixture("damaged.pdf"),
    ], "damaged-merge", "merge-pdf");
    await dispatch({ data: request });
    expectError(request.id, "damaged");
    expect(request.files).toEqual([]);
  });

  it("merges, splits, and extracts matching pages through the same worker", async () => {
    const inputs = await Promise.all([readFixture("merge-two.pdf"), readFixture("merge-three.pdf")]);
    const expected = (await Promise.all(inputs.map((input) => pageTexts(input.data.slice(0))))).flat();
    await dispatch({ data: job(inputs, "combined-merge", "merge-pdf") });
    const mergedReply = replies.find((reply) => reply.type === "result" && reply.id === "combined-merge");
    if (mergedReply?.type !== "result") throw new Error("Expected a merged PDF");
    const [merged] = resultOutputs(mergedReply.result);
    expect(await pageTexts(merged.data.slice(0))).toEqual(expected);

    for (const tool of ["split-pdf", "extract-pages"]) {
      const request = job([{ name: merged.name, data: merged.data.slice(0) }], tool, tool);
      request.options = { ranges: tool === "split-pdf" ? "1-2, 3-5" : "4, 2, 2" };
      await dispatch({ data: request });
      const reply = replies.find((entry) => entry.type === "result" && entry.id === tool);
      if (reply?.type !== "result") throw new Error(`Expected ${tool} output`);
      const outputs = resultOutputs(reply.result);
      const text = await Promise.all(outputs.map((output) => pageTexts(output.data.slice(0))));
      expect(text).toEqual(tool === "split-pdf"
        ? [expected.slice(0, 2), expected.slice(2)]
        : [[expected[1], expected[3]]]);
      expect(request.files).toEqual([]);
    }
    expect(transferred.map((buffers) => buffers.length)).toEqual([1, 2, 1]);
    expect(replies.filter((reply) => reply.type === "error")).toEqual([]);
  });

  it("rejects a single merge file and unsupported options", async () => {
    await dispatch({ data: job([await readFixture("invoice.pdf")], "single", "merge-pdf") });
    expectError("single", "too-few-files");
    const request = job([
      await readFixture("invoice.pdf"), await readFixture("report.pdf"),
    ], "options", "merge-pdf");
    request.options = { reverse: true };
    await dispatch({ data: request });
    expectError(request.id, "invalid-options");
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

  it.each(["rotate-pdf", "reorder-delete"])("runs %s and recovers from bad inputs/options", async (tool) => {
    for (const { name, code } of brokenFixtures) {
      await dispatch({ data: job([await readFixture(name)], name, tool) });
      expectError(name, code);
    }
    const invalid = job([await readFixture("report.pdf")], "invalid", tool);
    invalid.options = { order: [], rotations: [] };
    await dispatch({ data: invalid });
    expect(replies.find((reply) => reply.id === "invalid" && reply.type === "error")).toMatchObject({
      code: "invalid-options", message: expect.stringContaining("Keep at least one page."),
    });
    const request = job([await readFixture("four-pages.pdf")], "valid", tool);
    request.options = { order: tool === "rotate-pdf" ? [1, 2, 3, 4] : [4, 2, 1], rotations: [0, 90, 0, 0] };
    await dispatch({ data: request });
    const reply = replies.find((reply) => reply.id === "valid" && reply.type === "result");
    if (reply?.type !== "result") throw new Error("Expected a page-grid result");
    const [output] = resultOutputs(reply.result);
    expect((await PDFDocument.load(output.data)).getPageCount()).toBe(tool === "rotate-pdf" ? 4 : 3);
    expect(transferred).toHaveLength(1);
    expect(transferred[0]).toHaveLength(1);
    expect(request.files).toEqual([]);
  });

  it("rejects an empty selection without progress", async () => {
    await dispatch({ data: job([]) });
    expect(replies).toHaveLength(1);
    expectError("fixture-job", "empty");
  });

  it.each(["page-numbers", "watermark-pdf"])("runs %s, preserves content and transfers its output", async (tool) => {
    const file = await readFixture("overlay-pages.pdf");
    const original = await pageTexts(file.data.slice(0));
    const request = job([file], "overlay", tool);
    request.options = tool === "page-numbers"
      ? { position: "top-right", startNumber: 5 }
      : { text: "FICTIONAL DRAFT", ranges: "1, 3", position: "diagonal", opacity: 0.25 };
    await dispatch({ data: request });
    const reply = replies.find((entry) => entry.id === "overlay" && entry.type === "result");
    if (reply?.type !== "result") throw new Error("Expected an overlay result");
    const [output] = resultOutputs(reply.result);
    const updated = await pageTexts(output.data.slice(0));
    expect((await PDFDocument.load(output.data)).getPageCount()).toBe(3);
    original.forEach((text, index) => expect(updated[index]).toContain(text));
    if (tool === "watermark-pdf") {
      expect(updated[0]).toContain("FICTIONAL DRAFT");
      expect(updated[1]).toBe(original[1]);
      expect(updated[2]).toContain("FICTIONAL DRAFT");
    } else {
      updated.forEach((text, index) => expect(text).toMatch(new RegExp(`\\b${index + 5}\\b`)));
    }
    expect(transferred).toEqual([[output.data]]);
    expect(request.files).toEqual([]);
    const progress = replies.flatMap((entry) => entry.type === "progress" ? [entry.value] : []);
    expect(progress.at(-1)).toBe(100);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
  });

  it.each(["page-numbers", "watermark-pdf"])("recovers from broken inputs/options for %s", async (tool) => {
    for (const { name, code } of brokenFixtures) {
      await dispatch({ data: job([await readFixture(name)], name, tool) });
      expectError(name, code);
    }
    await dispatch({ data: job([await readFixture("invoice.pdf")], "invalid", tool) });
    expect(replies.find((reply) => reply.id === "invalid" && reply.type === "error")).toMatchObject({
      code: "invalid-options", message: expect.stringMatching(/choose|enter|use|try|correct/i),
    });
    const request = job([await readFixture("invoice.pdf")], "retry", tool);
    request.options = tool === "page-numbers"
      ? { position: "bottom-center", startNumber: -1 }
      : { text: "RETRY COPY", ranges: "1", position: "center", opacity: 0.5 };
    await dispatch({ data: request });
    expect(replies.find((entry) => entry.id === "retry" && entry.type === "result")).toBeDefined();
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
