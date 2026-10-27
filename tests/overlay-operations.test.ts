import { PDFDocument } from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";
import { pageNumbers } from "../src/lib/pdf-engine/page-numbers";
import { watermarkPdf } from "../src/lib/pdf-engine/watermark-pdf";
import { resultOutputs, type PdfJob, type PdfOptions } from "../src/lib/pdf-engine/protocol";
import { readFixture } from "./fixtures";
import { pageTexts, visibleTextItems } from "./pdf-output";

async function job(tool: string, options: PdfOptions, fixture = "overlay-pages.pdf"): Promise<PdfJob> {
  return { type: "job", id: "overlay", tool, files: [await readFixture(fixture)], options };
}
const progress = () => {};
const numberOptions = { position: "bottom-center", startNumber: 5 };
const markOptions = { text: "FICTIONAL DRAFT", ranges: "1, 3", position: "center", opacity: 0.25 };

async function checkPreserved(source: ArrayBuffer, output: ArrayBuffer) {
  const before = await PDFDocument.load(source);
  const after = await PDFDocument.load(output);
  expect(after.getPageCount()).toBe(before.getPageCount());
  expect(after.getTitle()).toBe(before.getTitle());
  expect(after.getPages().map((page) => [page.getMediaBox(), page.getCropBox(), page.getRotation().angle]))
    .toEqual(before.getPages().map((page) => [page.getMediaBox(), page.getCropBox(), page.getRotation().angle]));
  const original = await pageTexts(source.slice(0));
  const updated = await pageTexts(output.slice(0));
  original.forEach((text, index) => expect(updated[index]).toContain(text));
}

describe("Page numbers PDF operation", () => {
  it.each(["bottom-center", "bottom-right", "top-right"])(
    "numbers portrait, landscape, cropped and rotated pages at %s without clipping", async (position) => {
      const request = await job("page-numbers", { ...numberOptions, position });
      request.files[0].name = "fictional.PDF";
      const [output] = resultOutputs(await pageNumbers(request, progress));
      expect(output.name).toBe("fictional-numbered.pdf");
      expect(output.mimeType).toBe("application/pdf");
      await checkPreserved(request.files[0].data, output.data);
      const pages = await visibleTextItems(output.data.slice(0));
      pages.forEach((page, index) => {
        const number = page.items.find((item) => item.text === String(5 + index));
        expect(number).toBeDefined();
        if (!number) throw new Error("Missing page number");
        expect(number.dx).toBeGreaterThan(0);
        expect(number.dy).toBeCloseTo(0, 4);
        expect(number.x).toBeGreaterThan(0);
        expect(number.x + number.width).toBeLessThan(page.width);
        if (position === "bottom-center") {
          expect(number.x + number.width / 2).toBeCloseTo(page.width / 2, 1);
        } else {
          expect(page.width - number.x - number.width).toBeGreaterThan(10);
          expect(page.width - number.x - number.width).toBeLessThan(40);
        }
        expect(number.y).toBeGreaterThan(10);
        expect(number.y).toBeLessThan(page.height - 10);
        if (position === "top-right") expect(number.y).toBeLessThan(50);
        else expect(number.y).toBeGreaterThan(page.height - 50);
      });
    },
  );

  it.each([0, -5, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 2])(
    "accepts the exact starting integer %s", async (startNumber) => {
      const request = await job("page-numbers", { ...numberOptions, startNumber });
      const [output] = resultOutputs(await pageNumbers(request, progress));
      const pages = await visibleTextItems(output.data.slice(0));
      pages.forEach((page, index) => expect(page.items.some((item) => item.text === String(startNumber + index)))
        .toBe(true));
    },
  );

  it.each(["bottom-center", "bottom-right", "top-right"])(
    "keeps %s numbers upright through every existing quarter-turn orientation", async (position) => {
    for (const fixture of ["invoice.pdf", "four-pages.pdf"]) {
      const request = await job("page-numbers", { ...numberOptions, position }, fixture);
      const [output] = resultOutputs(await pageNumbers(request, progress));
      await checkPreserved(request.files[0].data, output.data);
      for (const page of await visibleTextItems(output.data.slice(0))) {
        const number = page.items.find((item) => /^\d+$/.test(item.text))!;
        expect(number.dx).toBeGreaterThan(0);
        expect(number.dy).toBeCloseTo(0, 4);
        if (position === "top-right") expect(number.y).toBeLessThan(50);
        else expect(number.y).toBeGreaterThan(page.height - 50);
        if (position === "bottom-center") {
          expect(number.x + number.width / 2).toBeCloseTo(page.width / 2, 1);
        } else expect(page.width - number.x - number.width).toBeCloseTo(24, 1);
      }
    }
  });

  it("rejects malformed, fractional, overflowing and unsupported numbering options", async () => {
    const options: PdfOptions[] = [{}, { ...numberOptions, position: "left" },
      { ...numberOptions, startNumber: "5" }, { ...numberOptions, startNumber: 1.5 },
      { ...numberOptions, startNumber: NaN }, { ...numberOptions, startNumber: Infinity },
      { ...numberOptions, startNumber: Number.MAX_SAFE_INTEGER },
      { ...numberOptions, startNumber: Number.MIN_SAFE_INTEGER - 1 }, { ...numberOptions, surprise: true }];
    for (const value of options) {
      await expect(pageNumbers(await job("page-numbers", value), progress)).rejects.toMatchObject({
        code: "invalid-options", message: expect.stringMatching(/choose|enter|use|try|correct/i),
      });
    }
  });

  it.each([
    ["merge-two.pdf", Number.MAX_SAFE_INTEGER],
    ["overlay-pages.pdf", Number.MAX_SAFE_INTEGER - 1],
  ])("rejects a final unsafe label in %s", async (fixture, startNumber) => {
    await expect(pageNumbers(await job("page-numbers", { ...numberOptions, startNumber }, fixture), progress))
      .rejects.toMatchObject({ code: "invalid-options", message: expect.stringMatching(/smaller starting number/) });
  });
});

describe("Watermark PDF operation", () => {
  it.each(["center", "diagonal"])("marks only selected mixed-orientation pages at %s", async (position) => {
    const request = await job("watermark-pdf", { ...markOptions, position });
    const [output] = resultOutputs(await watermarkPdf(request, progress));
    expect(output.name).toBe("overlay-pages-watermarked.pdf");
    await checkPreserved(request.files[0].data, output.data);
    const texts = await pageTexts(output.data.slice(0));
    expect(texts[0]).toContain(markOptions.text);
    expect(texts[2]).toContain(markOptions.text);
    expect(texts[1]).toBe((await pageTexts(request.files[0].data.slice(0)))[1]);
    const pages = await visibleTextItems(output.data.slice(0));
    for (const index of [0, 2]) {
      const page = pages[index];
      const mark = page.items.find((item) => item.text === markOptions.text)!;
      expect(page.fillOpacities).toContain(markOptions.opacity);
      expect(mark).toBeDefined();
      const radians = Math.atan2(mark.dy, mark.dx);
      const centerX = mark.x + Math.cos(radians) * mark.width / 2;
      const centerY = mark.y + Math.sin(radians) * mark.width / 2;
      expect(Math.abs(centerX - page.width / 2)).toBeLessThan(30);
      expect(Math.abs(centerY - page.height / 2)).toBeLessThan(30);
      expect(mark.x).toBeGreaterThan(0);
      expect(mark.x).toBeLessThan(page.width);
      if (position === "center") expect(mark.dy).toBeCloseTo(0, 4);
      else expect(Math.abs(mark.dy)).toBeGreaterThan(1);
    }
  });

  it.each(["center", "diagonal"])("keeps %s marks visible through every existing quarter turn", async (position) => {
    const request = await job("watermark-pdf", { ...markOptions, ranges: "", position }, "four-pages.pdf");
    const [output] = resultOutputs(await watermarkPdf(request, progress));
    await checkPreserved(request.files[0].data, output.data);
    for (const page of await visibleTextItems(output.data.slice(0))) {
      const mark = page.items.find((item) => item.text === markOptions.text)!;
      expect(mark.dx).toBeGreaterThan(0);
      expect(mark.x).toBeGreaterThan(0);
      expect(mark.y).toBeGreaterThan(0);
      if (position === "center") expect(mark.dy).toBeCloseTo(0, 4);
      else expect(mark.dy).toBeLessThan(0);
    }
  });

  it("treats blank ranges as every page and repeated ranges as one mark per page", async () => {
    for (const ranges of ["", "  ", "1-3, 2, 1-3"]) {
      const request = await job("watermark-pdf", { ...markOptions, ranges });
      const [output] = resultOutputs(await watermarkPdf(request, progress));
      const pages = await visibleTextItems(output.data.slice(0));
      pages.forEach((page) => expect(page.items.filter((item) => item.text === markOptions.text)).toHaveLength(1));
    }
  });

  it("fits a long watermark within the visible page", async () => {
    const text = "FICTIONAL REVIEW COPY ".repeat(5).trim();
    const [output] = resultOutputs(await watermarkPdf(await job("watermark-pdf", {
      ...markOptions, text, ranges: "", position: "center",
    }), progress));
    for (const page of await visibleTextItems(output.data.slice(0))) {
      const mark = page.items.find((item) => item.text === text)!;
      expect(mark).toBeDefined();
      expect(mark.x).toBeGreaterThan(0);
      expect(mark.x + mark.width).toBeLessThan(page.width);
    }
  });

  it("rejects empty or unsupported text, invisible opacity, bad ranges and unsupported options", async () => {
    const invalid: PdfOptions[] = [{}, { ...markOptions, text: "   " }, { ...markOptions, text: "漢字" },
      { ...markOptions, text: "a\nb" }, { ...markOptions, text: "a".repeat(501) },
      { ...markOptions, opacity: 0 }, { ...markOptions, opacity: 1.1 },
      { ...markOptions, opacity: NaN }, { ...markOptions, opacity: "0.25" },
      { ...markOptions, position: "left" }, { ...markOptions, surprise: true },
      { ...markOptions, ranges: "0" }, { ...markOptions, ranges: "3-1" }, { ...markOptions, ranges: "4" }];
    for (const options of invalid) {
      const error = await watermarkPdf(await job("watermark-pdf", options), progress).then(
        () => undefined, (failure: unknown) => failure,
      );
      expect(error, `Expected rejection for ${JSON.stringify(options)}`).toMatchObject({
        code: "invalid-options", message: expect.stringMatching(/choose|enter|use|try|correct/i),
      });
    }
  });
});

describe("overlay file-count validation", () => {
  it.each([[pageNumbers, numberOptions], [watermarkPdf, markOptions]] as const)(
    "requires exactly one PDF", async (operation, options) => {
      for (const count of [0, 2]) {
        const request = await job("overlay", options);
        request.files = count === 0 ? [] : [request.files[0], await readFixture("invoice.pdf")];
        await expect(operation(request, progress)).rejects.toMatchObject({ code: "invalid-options" });
      }
    },
  );
});
