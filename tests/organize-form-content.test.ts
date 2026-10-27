import { PDFBool, PDFDocument, PDFName } from "@cantoo/pdf-lib";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { beforeAll, describe, expect, it } from "vitest";
import { extractPages } from "../src/lib/pdf-engine/extract-pages";
import { mergePdf } from "../src/lib/pdf-engine/merge-pdf";
import { reorderDelete } from "../src/lib/pdf-engine/reorder-delete";
import { rotatePdf } from "../src/lib/pdf-engine/rotate-pdf";
import { splitPdf } from "../src/lib/pdf-engine/split-pdf";
import { resultOutputs, type PdfJob } from "../src/lib/pdf-engine/protocol";

async function fictionalForm(): Promise<ArrayBuffer> {
  const document = await PDFDocument.create();
  const page = document.addPage([300, 200]);
  const form = document.getForm();
  const field = form.createTextField("fictional");
  field.addToPage(page, { x: 30, y: 80, width: 220, height: 30, borderWidth: 0 });
  field.setText("Fictional visible value");
  // Some forms rely on the reader to render their value rather than storing an appearance stream.
  field.acroField.getWidgets()[0].dict.delete(PDFName.of("AP"));
  form.acroForm.dict.set(PDFName.of("NeedAppearances"), PDFBool.True);
  return (await document.save({ updateFieldAppearances: false })).buffer as ArrayBuffer;
}

async function darkPixels(data: ArrayBuffer): Promise<number> {
  const loading = getDocument({ data: new Uint8Array(data.slice(0)), useSystemFonts: true });
  try {
    const document = await loading.promise;
    const page = await document.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const canvas = createCanvas(viewport.width, viewport.height);
    await page.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise;
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] < 100 && pixels[index + 1] < 100 && pixels[index + 2] < 100) count++;
    }
    return count;
  } finally {
    await loading.destroy();
  }
}

const copiedPageTools = ["merge-pdf", "split-pdf", "extract-pages", "reorder-delete"] as const;

describe("visible filled-form content in Organize outputs", () => {
  let sourcePixels: number;
  let rotatedPixels: number;
  const outputPixels = new Map<string, number>();

  beforeAll(async () => {
    const source = await fictionalForm();
    sourcePixels = await darkPixels(source);
    // Setup and rendering errors must fail normally, rather than count as an expected product failure.
    expect(sourcePixels).toBeGreaterThan(100);
    const blank = await PDFDocument.create();
    blank.addPage([300, 200]);
    const blankData = (await blank.save()).buffer as ArrayBuffer;
    const operations = { "merge-pdf": mergePdf, "split-pdf": splitPdf,
      "extract-pages": extractPages, "reorder-delete": reorderDelete, "rotate-pdf": rotatePdf };
    for (const tool of [...copiedPageTools, "rotate-pdf"] as const) {
      const options: PdfJob["options"] = tool === "merge-pdf" ? {}
        : tool === "split-pdf" || tool === "extract-pages" ? { ranges: "1" }
          : { order: [1], rotations: [tool === "rotate-pdf" ? 90 : 0] };
      const job: PdfJob = { type: "job", id: tool, tool, options,
        files: [{ name: "fictional-form.pdf", data: source.slice(0) }] };
      if (tool === "merge-pdf") job.files.push({ name: "blank.pdf", data: blankData.slice(0) });
      const [output] = resultOutputs(await operations[tool](job, () => {}));
      const count = await darkPixels(output.data);
      if (tool === "rotate-pdf") rotatedPixels = count;
      else outputPixels.set(tool, count);
    }
  });

  it("renders the fictional source value without a stored appearance stream", () => {
    expect(sourcePixels).toBeGreaterThan(100);
  });

  it("keeps the visible field value when Rotate PDF turns the page", () => {
    expect(rotatedPixels).toBeGreaterThan(100);
  });

  // Known content-loss defect: copied pages lose the form catalog's NeedAppearances setting.
  // Merge, Split, Extract and Reorder & delete currently render this source field blank.
  // Remove .fails when the implementation preserves the visible value; an unexpected pass fails this test.
  it.fails.each(copiedPageTools)("%s must preserve the visible filled field", (tool) => {
    expect(outputPixels.get(tool)).toBeGreaterThan(100);
  });
});
