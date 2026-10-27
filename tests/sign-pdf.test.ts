import { PDFBool, PDFDict, PDFDocument, PDFName, PDFNumber, degrees, rgb } from "@cantoo/pdf-lib";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { signPdf } from "../src/lib/pdf-engine/sign-pdf";
import { resultOutputs, type PdfJob, type PdfOptions } from "../src/lib/pdf-engine/protocol";
import { readFixture } from "./fixtures";
import { pageTexts } from "./pdf-output";
import { signature } from "./sign-fixtures";

const options = { signature, page: 3, x: 0.2, y: 0.6, width: 0.3, height: 0.1 };
const invalidOptions: PdfOptions[] = [
  { signature: "" }, { signature: "data:image/png;base64,AAAA" }, { signature: "https://example.com/signature.png" },
  { page: 0 }, { page: 1.5 }, { page: 4 }, { page: "1" }, { x: -0.1 }, { x: NaN }, { y: Infinity },
  { x: 0.9 }, { width: 0 }, { height: -1 }, { width: "0.3" }, { certificate: true },
];
const ignoreProgress = () => {};
async function job(overrides: PdfOptions = {}): Promise<PdfJob> {
  return { type: "job", id: "sign", tool: "sign-pdf", files: [await readFixture("overlay-pages.pdf")],
    options: { ...options, ...overrides } };
}
async function renderPage(data: ArrayBuffer, number: number, intent: "display" | "print" = "display") {
  const loading = getDocument({ data: new Uint8Array(data.slice(0)), useSystemFonts: true });
  try {
    const document = await loading.promise;
    const page = await document.getPage(number);
    const viewport = page.getViewport({ scale: 1 });
    const rendered = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvas: rendered as unknown as HTMLCanvasElement, viewport, intent }).promise;
    return { width: viewport.width, height: viewport.height,
      pixels: rendered.getContext("2d").getImageData(0, 0, rendered.width, rendered.height).data,
      stride: rendered.width };
  } finally { await loading.destroy(); }
}
async function paintedText(data: ArrayBuffer, number: number) {
  const loading = getDocument({ data: new Uint8Array(data.slice(0)), useSystemFonts: true });
  try {
    const page = await (await loading.promise).getPage(number);
    const operators = await page.getOperatorList();
    return operators.argsArray.flat(2).map((value: unknown) =>
      value && typeof value === "object" && "unicode" in value ? value.unicode : "").join("");
  } finally { await loading.destroy(); }
}

describe("Sign PDF export", () => {
  it.each([0, 90, 180, 270])("matches the preview rectangle and image direction with crop and rotation %s", async (angle) => {
    const request = await job();
    const source = await PDFDocument.load(request.files[0].data);
    const page = source.getPage(2);
    page.setRotation(degrees(angle));
    // Include non-zero media/crop origins and UserUnit scaling in the coordinate contract.
    page.setMediaBox(-40, -20, 600, 800);
    page.setCropBox(30, 50, 450, 600);
    page.node.set(PDFName.of("UserUnit"), source.context.obj(1.5));
    request.files[0].data = (await source.save()).buffer as ArrayBuffer;
    const [output] = resultOutputs(await signPdf(request, ignoreProgress));
    expect(output.name).toBe("overlay-pages-signed.pdf");
    expect(output.mimeType).toBe("application/pdf");
    const reopened = await PDFDocument.load(output.data);
    expect(reopened.getPages().map((entry) => [entry.getMediaBox(), entry.getCropBox(), entry.getRotation().angle]))
      .toEqual(source.getPages().map((entry) => [entry.getMediaBox(), entry.getCropBox(), entry.getRotation().angle]));
    expect(await pageTexts(output.data.slice(0))).toEqual(await pageTexts(request.files[0].data.slice(0)));
    const rendered = await renderPage(output.data, 3);
    const red: number[][] = [];
    const blue: number[][] = [];
    for (let y = 0; y < Math.ceil(rendered.height); y++) {
      for (let x = 0; x < Math.ceil(rendered.width); x++) {
        const index = (y * rendered.stride + x) * 4;
        const [r, g, b] = rendered.pixels.slice(index, index + 3);
        if (r > 220 && g < 30 && b < 30) red.push([x, y]);
        if (b > 220 && r < 30 && g < 30) blue.push([x, y]);
      }
    }
    expect(red.length).toBeGreaterThan(100);
    expect(blue.length).toBeGreaterThan(10);
    const xs = red.map(([x]) => x);
    const ys = red.map(([, y]) => y);
    expect(Math.min(...xs)).toBeCloseTo(rendered.width * options.x, -0.3);
    expect(Math.max(...xs)).toBeCloseTo(rendered.width * (options.x + options.width) - 1, -0.3);
    expect(Math.min(...ys)).toBeCloseTo(rendered.height * options.y, -0.3);
    expect(Math.max(...ys)).toBeCloseTo(rendered.height * (options.y + options.height) - 1, -0.3);
    // Blue must stay in the top-left of the displayed image, regardless of the PDF page turn.
    expect(Math.max(...blue.map(([x]) => x))).toBeLessThan(rendered.width * (options.x + options.width / 3));
    expect(Math.max(...blue.map(([, y]) => y))).toBeLessThan(rendered.height * (options.y + options.height / 3));
    for (const number of [1, 2]) {
      expect((await renderPage(output.data, number)).pixels)
        .toEqual((await renderPage(request.files[0].data, number)).pixels);
    }
  });

  it("preserves visible filled values in a multi-page form", async () => {
    const request = await job({ page: 2 });
    const document = await PDFDocument.load(request.files[0].data);
    const field = document.getForm().createTextField("fictional-name");
    field.addToPage(document.getPage(1), { x: 30, y: 200, width: 220, height: 30 });
    field.setText("Fictional visitor");
    field.acroField.getWidgets()[0].dict.delete(PDFName.of("AP"));
    document.getForm().acroForm.dict.set(PDFName.of("NeedAppearances"), PDFBool.True);
    request.files[0].data = (await document.save({ updateFieldAppearances: false })).buffer as ArrayBuffer;
    const [output] = resultOutputs(await signPdf(request, ignoreProgress));
    const result = await PDFDocument.load(output.data);
    expect(result.getPageCount()).toBe(3);
    expect(await paintedText(output.data, 2)).toContain("Fictional visitor");
    // Outside the signature rectangle, existing page content must render identically.
    const before = await renderPage(request.files[0].data, 2);
    const after = await renderPage(output.data, 2);
    for (let y = 0; y < before.height * 0.5; y++) {
      const start = y * before.stride * 4;
      expect(after.pixels.slice(start, start + before.stride * 4))
        .toEqual(before.pixels.slice(start, start + before.stride * 4));
    }
  });

  it.each([2, 32])("keeps an unsigned page's hidden form appearance invisible (flags %s)", async (flags) => {
    const request = await job({ page: 3 });
    const source = await PDFDocument.load(request.files[0].data);
    const field = source.getForm().createTextField("fictional-private-field");
    field.addToPage(source.getPage(0), { x: 40, y: 200, width: 240, height: 40 });
    field.setText("Hidden fictional value");
    field.acroField.getWidgets()[0].setFlags(flags);
    request.files[0].data = (await source.save()).buffer as ArrayBuffer;
    const before = await renderPage(request.files[0].data, 1);
    const [output] = resultOutputs(await signPdf(request, ignoreProgress));
    expect((await renderPage(output.data, 1)).pixels).toEqual(before.pixels);
    expect((await pageTexts(output.data.slice(0)))[0]).not.toContain("Hidden fictional value");
  });

  it.each([
    { box: [0, 0, 100, 20], matrix: [1, 0, 0, 1, 0, 0] },
    { box: [10, 20, 110, 40], matrix: [0, 2, -1, 0, 17, -23] },
  ])("keeps saved appearance bounds and matrix on an unsigned page: %j", async ({ box, matrix }) => {
    const request = await job({ page: 3 });
    const source = await PDFDocument.load(request.files[0].data);
    const field = source.getForm().createTextField("fictional-custom-appearance");
    field.addToPage(source.getPage(0), { x: 40, y: 200, width: 200, height: 40, borderWidth: 0 });
    const appearance = source.context.flateStream(
      `1 0 0 rg ${box[0]} ${box[1]} 100 20 re f 0 0 1 rg ${box[0]} ${box[1]} 20 10 re f`,
      { Type: "XObject", Subtype: "Form", BBox: box, Matrix: matrix, Resources: {} },
    );
    field.acroField.getWidgets()[0].setNormalAppearance(source.context.register(appearance));
    request.files[0].data = (await source.save({ updateFieldAppearances: false })).buffer as ArrayBuffer;
    const before = await renderPage(request.files[0].data, 1);
    const [output] = resultOutputs(await signPdf(request, ignoreProgress));
    expect((await renderPage(output.data, 1)).pixels).toEqual(before.pixels);
  });

  it("keeps the signature above an opaque annotation in display and print output", async () => {
    const request = await job({ page: 1 });
    const source = await PDFDocument.load(request.files[0].data);
    const page = source.getPage(0);
    const { width, height } = page.getSize();
    const rect = [width * options.x, height * (1 - options.y - options.height),
      width * (options.x + options.width), height * (1 - options.y)];
    const appearance = source.context.flateStream("1 1 1 rg 0 0 120 40 re f", {
      Type: "XObject", Subtype: "Form", BBox: [0, 0, 120, 40], Resources: {},
    });
    page.node.addAnnot(source.context.register(source.context.obj({
      Type: "Annot", Subtype: "Stamp", Rect: rect, F: 4, AP: { N: source.context.register(appearance) },
    })));
    request.files[0].data = (await source.save()).buffer as ArrayBuffer;
    const [output] = resultOutputs(await signPdf(request, ignoreProgress));
    for (const intent of ["display", "print"] as const) {
      const rendered = await renderPage(output.data, 1, intent);
      const index = (Math.floor(height * 0.65) * rendered.stride + Math.floor(width * 0.4)) * 4;
      expect([...rendered.pixels.slice(index, index + 3)]).toEqual([255, 0, 0]);
    }
    const reopened = await PDFDocument.load(output.data);
    const annotations = reopened.getPage(0).node.Annots()!;
    const stamp = annotations.lookup(annotations.size() - 1, PDFDict);
    expect(stamp.lookup(PDFName.of("F"), PDFNumber).asNumber()).toBe(4 | 64 | 128);
    expect(annotations.size()).toBe(2);
  });

  it("preserves a widget painted above an earlier opaque stamp on an unsigned page", async () => {
    const request = await job({ page: 3 });
    const source = await PDFDocument.load(request.files[0].data);
    const page = source.getPage(0);
    const appearance = source.context.flateStream("1 1 1 rg 0 0 220 40 re f", {
      Type: "XObject", Subtype: "Form", BBox: [0, 0, 220, 40], Resources: {},
    });
    page.node.addAnnot(source.context.register(source.context.obj({
      Type: "Annot", Subtype: "Stamp", Rect: [30, 200, 250, 240], F: 4,
      AP: { N: source.context.register(appearance) },
    })));
    const field = source.getForm().createTextField("fictional-top-widget");
    field.addToPage(page, { x: 30, y: 200, width: 220, height: 40 });
    field.setText("Visible fictional text");
    request.files[0].data = (await source.save()).buffer as ArrayBuffer;
    const before = await renderPage(request.files[0].data, 1);
    const [output] = resultOutputs(await signPdf(request, ignoreProgress));
    expect((await renderPage(output.data, 1)).pixels).toEqual(before.pixels);
    expect(await paintedText(output.data, 1)).toContain("Visible fictional text");
  });

  it("preserves a printable widget that is hidden on screen", async () => {
    const request = await job({ page: 3 });
    const source = await PDFDocument.load(request.files[0].data);
    const field = source.getForm().createTextField("fictional-print-only");
    field.addToPage(source.getPage(0), { x: 30, y: 200, width: 220, height: 40 });
    field.setText("Print this fictional value");
    field.acroField.getWidgets()[0].setFlags(32 | 4);
    request.files[0].data = (await source.save()).buffer as ArrayBuffer;
    const [output] = resultOutputs(await signPdf(request, ignoreProgress));
    const display = await renderPage(request.files[0].data, 1);
    const printed = await renderPage(request.files[0].data, 1, "print");
    expect(printed.pixels).not.toEqual(display.pixels);
    expect((await renderPage(output.data, 1)).pixels).toEqual(display.pixels);
    expect((await renderPage(output.data, 1, "print")).pixels).toEqual(printed.pixels);
  });

  it("uses the current form value when NeedAppearances invalidates an older saved appearance", async () => {
    const request = await job({ page: 3 });
    const source = await PDFDocument.load(request.files[0].data);
    const form = source.getForm();
    const field = form.createTextField("fictional-updated-value");
    field.addToPage(source.getPage(0), { x: 30, y: 200, width: 220, height: 40 });
    field.setText("Old fictional value");
    form.updateFieldAppearances();
    field.setText("Current fictional value");
    form.acroForm.dict.set(PDFName.of("NeedAppearances"), PDFBool.True);
    request.files[0].data = (await source.save({ updateFieldAppearances: false })).buffer as ArrayBuffer;
    expect(await paintedText(request.files[0].data, 1)).toContain("Current fictional value");
    const [output] = resultOutputs(await signPdf(request, ignoreProgress));
    expect(await paintedText(output.data, 1)).toContain("Current fictional value");
    expect(await paintedText(output.data, 1)).not.toContain("Old fictional value");
  });

  it("rejects widget visibility that cannot safely become a fixed appearance", async () => {
    const request = await job();
    const source = await PDFDocument.load(request.files[0].data);
    const field = source.getForm().createTextField("fictional-invisible-flag");
    field.addToPage(source.getPage(0), { x: 30, y: 200, width: 220, height: 40 });
    field.setText("Fictional value");
    field.acroField.getWidgets()[0].setFlags(1);
    request.files[0].data = (await source.save()).buffer as ArrayBuffer;
    await expect(signPdf(request, ignoreProgress)).rejects.toMatchObject({
      code: "invalid-options", message: expect.stringContaining("Export a regular PDF copy"),
    });
  });

  it.each(invalidOptions)("rejects unusable signatures or placement with correction advice: %j", async (invalid) => {
    await expect(signPdf(await job(invalid), ignoreProgress))
      .rejects.toMatchObject({ code: "invalid-options", message: expect.stringContaining("try again") });
  });

  it("requires one PDF and accepts placement exactly against the bottom and right page edges", async () => {
    const request = await job({ x: 0.7, y: 0.9 });
    expect(resultOutputs(await signPdf(request, ignoreProgress))).toHaveLength(1);
    request.files.push(await readFixture("invoice.pdf"));
    await expect(signPdf(request, ignoreProgress)).rejects.toMatchObject({ code: "invalid-options" });
  });

  it("paints above a form field while keeping the other pages and existing form text intact", async () => {
    const request = await job({ page: 1 });
    const document = await PDFDocument.load(request.files[0].data);
    const page = document.getPage(0);
    const { width, height } = page.getSize();
    const form = document.getForm();
    const field = form.createTextField("fictional-sign-here");
    field.addToPage(page, { x: options.x * width, y: (1 - options.y - options.height) * height,
      width: options.width * width, height: options.height * height, borderWidth: 0, backgroundColor: rgb(1, 1, 1) });
    const other = form.createTextField("fictional-other-page");
    other.addToPage(document.getPage(1), { x: 30, y: 200, width: 220, height: 30 });
    other.setText("Keep this fictional value");
    request.files[0].data = (await document.save()).buffer as ArrayBuffer;
    const [output] = resultOutputs(await signPdf(request, ignoreProgress));
    const rendered = await renderPage(output.data, 1);
    const index = (Math.floor(height * 0.65) * rendered.stride + Math.floor(width * 0.4)) * 4;
    expect([...rendered.pixels.slice(index, index + 3)]).toEqual([255, 0, 0]);
    expect(await paintedText(output.data, 2)).toContain("Keep this fictional value");
    const after = await renderPage(output.data, 2);
    const before = await renderPage(request.files[0].data, 2);
    const differences = [];
    for (let index = 0; index < after.pixels.length; index++) {
      if (after.pixels[index] !== before.pixels[index] && differences.length < 10) {
        differences.push({ x: Math.floor(index / 4) % after.stride,
          y: Math.floor(index / 4 / after.stride), after: after.pixels[index], before: before.pixels[index] });
      }
    }
    expect(differences).toEqual([]);
  });

  it("rejects an XFA form with a correction instead of silently losing its content", async () => {
    const request = await job();
    const document = await PDFDocument.load(request.files[0].data);
    const form = document.getForm();
    form.acroForm.dict.set(PDFName.of("XFA"), document.context.register(document.context.stream("fictional-xfa")));
    request.files[0].data = (await document.save()).buffer as ArrayBuffer;
    await expect(signPdf(request, ignoreProgress))
      .rejects.toMatchObject({ code: "invalid-options", message: expect.stringContaining("Export a regular PDF") });
  });

  it("keeps transparent margins so a drawn signature's strokes occupy the previewed part of its box", async () => {
    const mark = createCanvas(120, 40);
    const context = mark.getContext("2d");
    context.fillStyle = "#ff0000";
    context.fillRect(12, 8, 90, 20);
    const request = await job({ page: 1, signature: mark.toDataURL("image/png") });
    const [output] = resultOutputs(await signPdf(request, ignoreProgress));
    const rendered = await renderPage(output.data, 1);
    const y = Math.floor(rendered.height * (options.y + options.height * 0.5));
    const transparentX = Math.floor(rendered.width * (options.x + options.width * 0.05));
    const opaqueX = Math.floor(rendered.width * (options.x + options.width * 0.5));
    const before = await renderPage(request.files[0].data, 1);
    const transparent = (y * rendered.stride + transparentX) * 4;
    const opaque = (y * rendered.stride + opaqueX) * 4;
    expect(rendered.pixels.slice(transparent, transparent + 4)).toEqual(before.pixels.slice(transparent, transparent + 4));
    expect([...rendered.pixels.slice(opaque, opaque + 3)]).toEqual([255, 0, 0]);
  });
});
