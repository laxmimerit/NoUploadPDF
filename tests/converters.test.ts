import { PDFDocument, rgb, StandardFonts } from "@cantoo/pdf-lib";
import { createCanvas, loadImage, Path2D, DOMMatrix } from "@napi-rs/canvas";
import { unzipSync } from "fflate";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { imagesToPdf } from "../src/lib/pdf-engine/images-to-pdf";
import { pdfToImages } from "../src/lib/pdf-engine/pdf-to-images";
import { resultOutputs, type PdfJob } from "../src/lib/pdf-engine/protocol";

const progress = () => {};
function job(tool: string, files: PdfJob["files"], options: PdfJob["options"] = {}): PdfJob {
  return { type: "job", id: "test", tool, files, options };
}
function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

beforeAll(async () => {
  const workerPath = "pdfjs-dist/legacy/build/pdf.worker.mjs";
  const worker = await import(workerPath);
  Object.assign(globalThis, { pdfjsWorker: worker });
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

describe("converters", () => {
  it("makes full-size pages in the chosen order from mixed JPEG and PNG images", async () => {
    const files = [[80, 120, "red", "portrait.png"], [160, 90, "blue", "landscape.jpg"],
      [100, 100, "green", "square.png"]].map(([width, height, color, name]) => {
      const canvas = createCanvas(width as number, height as number);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = color as string;
      ctx.fillRect(0, 0, width as number, height as number);
      ctx.fillStyle = "white";
      ctx.font = "12px sans-serif";
      ctx.fillText(name as string, 8, 28);
      return { name: name as string, data: arrayBuffer(name === "landscape.jpg" ? canvas.toBuffer("image/jpeg") : canvas.toBuffer("image/png")) };
    });
    const output = resultOutputs(await imagesToPdf(job("images-to-pdf", [files[1], files[0], files[2]]), progress))[0];
    const pdf = await PDFDocument.load(output.data);
    expect(output.name).toBe("landscape.pdf");
    expect(pdf.getPages().map((page) => [page.getWidth(), page.getHeight()])).toEqual([[160, 90], [80, 120], [100, 100]]);
    const original = resultOutputs(await imagesToPdf(job("images-to-pdf", files), progress))[0];
    const originalPdf = await PDFDocument.load(original.data);
    expect(originalPdf.getPages().map((page) => [page.getWidth(), page.getHeight()]))
      .toEqual([[80, 120], [160, 90], [100, 100]]);
    const rendered = resultOutputs(await pdfToImages(job("pdf-to-images", [
      { name: "converted.pdf", data: output.data.slice(0) },
    ], { ranges: "" }), progress))[0];
    const pages = unzipSync(new Uint8Array(rendered.data));
    for (const [number, expected] of [[1, [0, 0, 254]], [2, [255, 0, 0]], [3, [0, 128, 0]]] as const) {
      const image = await loadImage(Buffer.from(pages[`converted-page-${number}.png`]));
      const canvas = createCanvas(image.width, image.height);
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      const pixel = [...context.getImageData(10, 10, 1, 1).data];
      expected.forEach((value, channel) => expect(Math.abs(pixel[channel] - value)).toBeLessThan(4));
    }
    await expect(imagesToPdf(job("images-to-pdf", [{ name: "bad.png", data: new ArrayBuffer(5) }]), progress))
      .rejects.toThrow(/valid JPEG or PNG/);
  });

  it("rejects oversized and extreme-aspect pages before allocating a canvas", async () => {
    for (const [width, height] of [[2100, 2100], [5000, 1]]) {
      const source = await PDFDocument.create();
      source.addPage([width, height]);
      const allocate = vi.fn();
      vi.stubGlobal("OffscreenCanvas", allocate);
      try {
        await expect(pdfToImages(job("pdf-to-images", [
          { name: "large.pdf", data: arrayBuffer(await source.save()) },
        ], { ranges: "" }), progress)).rejects.toThrow(/too large.*smaller pages/);
        expect(allocate).not.toHaveBeenCalled();
      } finally {
        vi.stubGlobal("OffscreenCanvas", class {
          constructor(w: number, h: number) { return createCanvas(w, h); }
        });
      }
    }
  });

  it("renders text from a real PDF into the image", async () => {
    const source = await PDFDocument.create();
    const font = await source.embedFont(StandardFonts.Helvetica);
    source.addPage([180, 80]).drawText("Page 2 sample", { x: 15, y: 25, size: 20, font });
    const output = resultOutputs(await pdfToImages(job("pdf-to-images", [
      { name: "text.pdf", data: arrayBuffer(await source.save()) },
    ], { ranges: "1" }), progress))[0];
    const image = await loadImage(Buffer.from(output.data));
    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    let dark = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] < 100 && pixels[i + 1] < 100 && pixels[i + 2] < 100) dark++;
    }
    expect(dark).toBeGreaterThan(100);
  });

  it("exports three identifiable PNGs in one ZIP and page two as a single PNG", async () => {
    const source = await PDFDocument.create();
    for (const color of [rgb(1, 0, 0), rgb(0, 1, 0), rgb(0, 0, 1)]) {
      source.addPage([60, 40]).drawRectangle({ x: 0, y: 0, width: 60, height: 40, color });
    }
    const bytes = arrayBuffer(await source.save());
    const input = () => [{ name: "sample.pdf", data: bytes.slice(0) }];
    const all = resultOutputs(await pdfToImages(job("pdf-to-images", input(), { ranges: "" }), progress))[0];
    expect(all.name).toBe("sample.zip");
    const entries = unzipSync(new Uint8Array(all.data));
    expect(Object.keys(entries)).toEqual(["sample-page-1.png", "sample-page-2.png", "sample-page-3.png"]);
    const single = resultOutputs(await pdfToImages(job("pdf-to-images", input(), { ranges: "2" }), progress))[0];
    expect(single.name).toBe("sample-page-2.png");
    expect(new Uint8Array(single.data)).toEqual(entries["sample-page-2.png"]);
    const image = await loadImage(Buffer.from(single.data));
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    expect([...ctx.getImageData(20, 20, 1, 1).data]).toEqual([0, 255, 0, 255]);
    await expect(pdfToImages(job("pdf-to-images", input(), { ranges: "4" }), progress)).rejects.toThrow(/this PDF has 3/);
  });
});
