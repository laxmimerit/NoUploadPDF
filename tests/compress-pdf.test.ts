import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream } from "@cantoo/pdf-lib";
import { createCanvas, DOMMatrix, Path2D, loadImage } from "@napi-rs/canvas";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { compressPdf } from "../src/lib/pdf-engine/compress-pdf";
import type { PdfJob } from "../src/lib/pdf-engine/protocol";
import { resultOutputs } from "../src/lib/pdf-engine/protocol";
import { readFixture } from "./fixtures";
import { pageTexts } from "./pdf-output";

describe("Clean up PDF", () => {
  it("preserves page text and order while making a compressible PDF smaller", async () => {
    const source = await readFixture("report.pdf");
    const doc = await PDFDocument.load(source.data, { updateMetadata: false });
    const bytes = await doc.save({ useObjectStreams: false, updateFieldAppearances: false });
    const data = bytes.buffer as ArrayBuffer;
    const before = await pageTexts(data.slice(0));
    const job: PdfJob = { type: "job", id: "1", tool: "compress-pdf", files: [{ name: source.name, data }],
      options: { mode: "cleanup" } };
    const [output] = resultOutputs(await compressPdf(job, () => {}));
    expect(output.data.byteLength).toBeLessThan(data.byteLength);
    expect(await pageTexts(output.data.slice(0))).toEqual(before);
    expect(output.name).toBe("report-compressed.pdf");
  });

  it("offers the exact original when another rewrite cannot reduce it", async () => {
    const source = await readFixture("invoice.pdf");
    const doc = await PDFDocument.load(source.data, { updateMetadata: false });
    const bytes = await doc.save({ useObjectStreams: true, updateFieldAppearances: false });
    const data = bytes.buffer as ArrayBuffer;
    const job: PdfJob = { type: "job", id: "2", tool: "compress-pdf", files: [{ name: source.name, data }],
      options: { mode: "cleanup" } };
    const [output] = resultOutputs(await compressPdf(job, () => {}));
    expect(output.name).toBe(source.name);
    expect(new Uint8Array(output.data)).toEqual(new Uint8Array(data));
  });

  it("preserves image data and page geometry in a rewritten PDF", async () => {
    const document = await PDFDocument.create();
    const canvas = createCanvas(20, 20);
    canvas.getContext("2d").fillRect(0, 0, 20, 20);
    const image = await document.embedPng(canvas.toBuffer("image/png"));
    const page = document.addPage([240, 300]);
    page.setCropBox(10, 20, 200, 250);
    page.drawImage(image, { x: 20, y: 30, width: 100, height: 100 });
    const bytes = await document.save({ useObjectStreams: false });
    const data = bytes.buffer as ArrayBuffer;
    const job: PdfJob = { type: "job", id: "4", tool: "compress-pdf", files: [{ name: "image.pdf", data }],
      options: { mode: "cleanup" } };
    const [output] = resultOutputs(await compressPdf(job, () => {}));
    expect(output.data.byteLength).toBeLessThan(data.byteLength);
    const reopened = await PDFDocument.load(output.data);
    expect(reopened.getPage(0).getCropBox()).toEqual(page.getCropBox());
    const images = (pdf: PDFDocument) => pdf.context.enumerateIndirectObjects().flatMap(([, obj]) =>
      obj instanceof PDFRawStream && obj.dict.get(PDFName.of("Subtype")) === PDFName.of("Image")
        ? [Array.from(obj.contents)] : []);
    expect(images(reopened)).toEqual(images(await PDFDocument.load(data)));
    expect(images(reopened)).toHaveLength(1);
  });

  it("keeps the original bytes for a document with a signature byte range", async () => {
    const document = await PDFDocument.create();
    document.addPage();
    const signature = document.context.obj({ Type: "Sig", ByteRange: [0, 1, 2, 3] });
    expect(signature).toBeInstanceOf(PDFDict);
    expect(signature.lookup(PDFName.of("ByteRange"))).toBeInstanceOf(PDFArray);
    document.context.register(signature);
    const bytes = await document.save({ useObjectStreams: false });
    const data = bytes.buffer as ArrayBuffer;
    const job: PdfJob = { type: "job", id: "5", tool: "compress-pdf", files: [{ name: "signed.pdf", data }],
      options: { mode: "cleanup" } };
    const [output] = resultOutputs(await compressPdf(job, () => {}));
    expect(output.name).toBe("signed.pdf");
    expect(new Uint8Array(output.data)).toEqual(new Uint8Array(data));
  });

  it("rejects invalid options and extra files with a correction", async () => {
    const file = await readFixture("invoice.pdf");
    const job: PdfJob = { type: "job", id: "3", tool: "compress-pdf", files: [file], options: { mode: "scan", quality: "wrong" } };
    await expect(compressPdf(job, () => {})).rejects.toMatchObject({ code: "invalid-options" });
    job.options = { mode: "cleanup" };
    job.files.push(file);
    await expect(compressPdf(job, () => {})).rejects.toMatchObject({ code: "invalid-options" });
  });
});


describe("Scan PDF", () => {
  beforeAll(async () => {
    const workerPath = "pdfjs-dist/legacy/build/pdf.worker.mjs";
    Object.assign(globalThis, { pdfjsWorker: await import(workerPath) });
    vi.stubGlobal("Path2D", Path2D);
    vi.stubGlobal("DOMMatrix", DOMMatrix);
    vi.stubGlobal("OffscreenCanvas", class {
      constructor(width: number, height: number) { return createCanvas(width, height); }
    });
    vi.stubGlobal("createImageBitmap", async (blob: Blob) => {
      const image = await loadImage(Buffer.from(await blob.arrayBuffer()));
      return Object.assign(image, { close: () => {} });
    });
  });
  afterAll(() => vi.unstubAllGlobals());

  it("rasterizes selectable text and offers the original when rasterizing grows the file", async () => {
    const file = await readFixture("invoice.pdf");
    const padded = new Uint8Array(file.data.byteLength + 500000);
    padded.set(new Uint8Array(file.data));
    const makeJob = (data: ArrayBuffer): PdfJob => ({ type: "job", id: "text", tool: "compress-pdf",
      files: [{ name: "invoice.pdf", data }], options: { mode: "scan", quality: "smaller" } });
    expect((await pageTexts(file.data.slice(0)))[0]).toContain("FICTIONAL INVOICE");
    const [scanned] = resultOutputs(await compressPdf(makeJob(padded.buffer), () => {}));
    expect(scanned.name).toBe("invoice-compressed.pdf");
    expect(await pageTexts(scanned.data.slice(0))).toEqual([""]);
    const [original] = resultOutputs(await compressPdf(makeJob(file.data), () => {}));
    expect(original.name).toBe("invoice.pdf");
    expect(new Uint8Array(original.data)).toEqual(new Uint8Array(file.data));
  });

  it.each(["smaller", "clearer"])("compresses a fictional scan with %s quality", async (quality) => {
    const file = await readFixture("scanned.pdf");
    const job: PdfJob = { type: "job", id: "scan", tool: "compress-pdf", files: [file],
      options: { mode: "scan", quality } };
    const [result] = resultOutputs(await compressPdf(job, () => {}));
    expect(result.data.byteLength).toBeLessThan(file.data.byteLength);
    const pdf = await PDFDocument.load(result.data);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPages().map((page) => page.getSize())).toEqual([{ width: 300, height: 400 },
      { width: 300, height: 400 }]);
    expect(await pageTexts(result.data.slice(0))).toEqual(["", ""]);
    const { pdfToImages } = await import("../src/lib/pdf-engine/pdf-to-images");
    for (const [page, dominant] of [[1, 0], [2, 2]] as const) {
      const rendered = resultOutputs(await pdfToImages({ ...job, files: [{ name: "out.pdf", data: result.data.slice(0) }],
        options: { ranges: String(page) } }, () => {}))[0];
      const image = await loadImage(Buffer.from(rendered.data));
      const canvas = createCanvas(image.width, image.height);
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      const pixel = context.getImageData(100, 100, 1, 1).data;
      expect(pixel[dominant]).toBeGreaterThan(pixel[dominant === 0 ? 2 : 0] + 40);
    }
  });
});
