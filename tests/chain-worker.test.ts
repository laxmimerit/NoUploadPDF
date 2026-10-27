import { PDFDocument } from "@cantoo/pdf-lib";
import { createCanvas, DOMMatrix, Path2D, loadImage } from "@napi-rs/canvas";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdfError } from "../src/lib/pdf-engine/errors";
import { resultOutputs, type PdfInput, type PdfJob, type PdfOptions, type PdfReply } from "../src/lib/pdf-engine/protocol";
import { readFixture } from "./fixtures";
import { pageTexts, visibleTextItems } from "./pdf-output";

const slug = "merge-number-compress";

describe("merge, number and compress worker", () => {
  let replies: PdfReply[];
  let transfers: Transferable[][];
  let dispatch: (event: { data: PdfJob }) => Promise<void>;

  const job = (files: PdfInput[], id: string, options: PdfOptions = { mode: "cleanup" }): PdfJob =>
    ({ type: "job", id, tool: slug, files, options });

  beforeEach(async () => {
    replies = [];
    transfers = [];
    vi.resetModules();
    vi.stubGlobal("onmessage", null);
    vi.stubGlobal("postMessage", (reply: PdfReply, transfer: Transferable[] = []) => {
      replies.push(structuredClone(reply));
      if (reply.type === "result") transfers.push(transfer);
    });
    await import("../src/lib/pdf-engine/worker");
    dispatch = Reflect.get(globalThis, "onmessage") as typeof dispatch;
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["merge-two.pdf", "merge-three.pdf"],
    ["merge-three.pdf", "merge-two.pdf"],
  ])("returns one numbered PDF preserving the order %s, %s", async (first, second) => {
    const inputs = await Promise.all([readFixture(first), readFixture(second)]);
    const original = (await Promise.all(inputs.map((input) => pageTexts(input.data.slice(0))))).flat();
    const request = job(inputs, "success");
    await dispatch({ data: request });
    const terminal = replies.filter((reply) => reply.type !== "progress");
    expect(terminal).toHaveLength(1);
    const reply = terminal[0];
    if (reply.type !== "result") throw new Error(`Expected a PDF, got ${JSON.stringify(reply)}`);
    const outputs = resultOutputs(reply.result);
    expect(outputs).toHaveLength(1);
    expect(outputs[0].mimeType).toBe("application/pdf");
    expect(outputs[0].data.byteLength).toBeLessThanOrEqual(outputs[0].compressionInputSize!);
    expect(outputs[0].name).toMatch(/\.pdf$/i);
    const pages = await visibleTextItems(outputs[0].data.slice(0));
    const texts = await pageTexts(outputs[0].data.slice(0));
    expect(pages).toHaveLength(5);
    pages.forEach((page, index) => {
      expect(texts[index]).toContain(original[index]);
      const number = page.items.find((item) => item.text === String(index + 1));
      expect(number).toBeDefined();
      expect(number!.x + number!.width / 2).toBeCloseTo(page.width / 2, 1);
      expect(number!.y).toBeGreaterThan(page.height - 50);
    });
    expect(transfers).toEqual([[outputs[0].data]]);
    expect(request.files).toEqual([]);
    const progress = replies.filter((reply) => reply.type === "progress");
    const values = progress.map((reply) => reply.value);
    expect(values.at(-1)).toBe(100);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    for (const step of ["Merge PDF", "Page numbers", "Compress PDF"]) {
      expect(progress.some((reply) => reply.message.includes(step))).toBe(true);
    }
  });

  it.each([
    ["damaged.pdf", "damaged"], ["password-protected.pdf", "password"], ["renamed-text.pdf", "not-pdf"],
  ] as const)("stops at Merge PDF for %s in the middle and permits retry", async (fixture, code) => {
    const request = job(await Promise.all(["merge-two.pdf", fixture, "merge-three.pdf"].map(readFixture)), "broken");
    await dispatch({ data: request });
    expect(replies.filter((reply) => reply.type !== "progress")).toEqual([{
      type: "error", id: "broken", code, message: `Merge PDF: ${new PdfError(code).message}`,
    }]);
    expect(transfers).toEqual([]);
    expect(request.files).toEqual([]);
    const retry = job(await Promise.all(["merge-two.pdf", "merge-three.pdf"].map(readFixture)), "retry");
    await dispatch({ data: retry });
    expect(replies.some((reply) => reply.id === "retry" && reply.type === "result")).toBe(true);
  });

  it("names Page numbers when a page is too small and never returns a partial PDF", async () => {
    const document = await PDFDocument.create();
    document.addPage([1, 1]);
    const bytes = await document.save();
    const request = job([await readFixture("invoice.pdf"), { name: "tiny.pdf", data: bytes.buffer }], "tiny");
    await dispatch({ data: request });
    expect(replies.filter((reply) => reply.type !== "progress")).toEqual([
      expect.objectContaining({ type: "error", id: "tiny", code: "invalid-options",
        message: expect.stringMatching(/^Page numbers: .*larger-page PDF/) }),
    ]);
    expect(transfers).toEqual([]);
  });

  it("names Compress PDF for invalid options and never returns a partial PDF", async () => {
    const request = job(await Promise.all(["merge-two.pdf", "merge-three.pdf"].map(readFixture)), "bad-options",
      { mode: "scan", quality: "invalid" });
    await dispatch({ data: request });
    expect(replies.filter((reply) => reply.type !== "progress")).toEqual([
      expect.objectContaining({ type: "error", id: "bad-options", code: "invalid-options",
        message: expect.stringMatching(/^Compress PDF: /) }),
    ]);
    expect(transfers).toEqual([]);
  });

  it("returns a smaller rasterized Scan PDF with visible page numbers", async () => {
    const fs = process.getBuiltinModule("fs/promises") as typeof import("node:fs/promises");
    const read = fs.readFile.bind(fs);
    const spy = vi.spyOn(fs, "readFile").mockImplementation(((path: string, ...args: unknown[]) => {
      const actual = typeof path === "string" && path.startsWith("/pdfjs/") ? path.replace("/pdfjs/", `${process.cwd()}/node_modules/pdfjs-dist/`) : path;
      return (read as (...parameters: unknown[]) => unknown)(actual, ...args);
    }) as typeof fs.readFile);
    try {
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
      const inputs = await Promise.all([readFixture("scanned.pdf"), readFixture("scanned.pdf")]);
      inputs[1].name = "second.pdf";
      await dispatch({ data: job(inputs, "small-scan", { mode: "scan", quality: "smaller" }) });
      const reply = replies.find((entry) => entry.type !== "progress");
      if (reply?.type !== "result") throw new Error(`Expected result, got ${JSON.stringify(reply)}`);
      const [output] = resultOutputs(reply.result);
      expect(output.data.byteLength).toBeLessThan(output.compressionInputSize!);
      expect(await pageTexts(output.data.slice(0))).toEqual(["", "", "", ""]);
      const { pdfToImages } = await import("../src/lib/pdf-engine/pdf-to-images");
      for (let index = 1; index <= 4; index++) {
        const imageJob = job([{ name: output.name, data: output.data.slice(0) }], "images", { ranges: String(index) });
        const [rendered] = resultOutputs(await pdfToImages(imageJob, () => {}));
        const image = await loadImage(Buffer.from(rendered.data));
        const canvas = createCanvas(image.width, image.height);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        const color = context.getImageData(100, 100, 1, 1).data;
        const dominant = index % 2 === 1 ? 0 : 2;
        expect(color[dominant]).toBeGreaterThan(color[dominant === 0 ? 2 : 0] + 40);
        const pixels = context.getImageData(260, 720, 80, 60).data;
        let dark = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] < 80 && pixels[i + 1] < 80 && pixels[i + 2] < 80) dark++;
        }
        expect(dark).toBeGreaterThan(5);
      }
    } finally {
      spy.mockRestore();
    }
  });

  it.each(["smaller", "clearer"])("accepts Scan with %s quality and returns one PDF", async (quality) => {
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
    const request = job(await Promise.all(["invoice.pdf", "merge-two.pdf"].map(readFixture)), "scan",
      { mode: "scan", quality });
    await dispatch({ data: request });
    const reply = replies.find((entry) => entry.type !== "progress");
    if (reply?.type !== "result") throw new Error(`Expected scan result, got ${JSON.stringify(reply)}`);
    const outputs = resultOutputs(reply.result);
    expect(outputs).toHaveLength(1);
    expect((await PDFDocument.load(outputs[0].data)).getPageCount()).toBe(3);
    // These compact text fixtures expand when scanned, so the result must be the numbered intermediate.
    expect(outputs[0].data.byteLength).toBe(outputs[0].compressionInputSize);
    const pages = await visibleTextItems(outputs[0].data.slice(0));
    pages.forEach((page, index) => expect(page.items.some((item) => item.text === String(index + 1))).toBe(true));
    expect(transfers).toEqual([[outputs[0].data]]);
  });
});
