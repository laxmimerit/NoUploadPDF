import { PDFDocument } from "@cantoo/pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { extractPages } from "../src/lib/pdf-engine/extract-pages";
import { splitPdf } from "../src/lib/pdf-engine/split-pdf";
import { resultOutputs, type PdfJob, type PdfOutput } from "../src/lib/pdf-engine/protocol";
import { readFixture } from "./fixtures";

const progress = () => {};
async function job(ranges: string, name = "report.pdf"): Promise<PdfJob> {
  return { type: "job", id: "pages", tool: "", files: [await readFixture(name)], options: { ranges } };
}

async function pageText(data: ArrayBuffer): Promise<string[]> {
  const task = getDocument({ data: new Uint8Array(data.slice(0)), useSystemFonts: true });
  const document = await task.promise;
  try {
    const text: string[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      text.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
    }
    return text;
  } finally {
    await task.destroy();
  }
}

async function checkPages(output: PdfOutput, sourceText: string[], numbers: number[]) {
  expect(output.mimeType).toBe("application/pdf");
  expect((await PDFDocument.load(output.data)).getPageCount()).toBe(numbers.length);
  expect(await pageText(output.data)).toEqual(numbers.map((number) => sourceText[number - 1]));
}

describe("Split PDF and Extract pages", () => {
  it("splits the five-page fixture into two and three matching pages", async () => {
    const request = await job("1-2, 3-5", "five-pages.pdf");
    const sourceText = await pageText(request.files[0].data);
    const outputs = resultOutputs(await splitPdf(request, progress));
    expect(outputs).toHaveLength(2);
    expect(outputs.map((output) => output.name)).toEqual(["split-1-pages-1-2.pdf", "split-2-pages-3-5.pdf"]);
    await checkPages(outputs[0], sourceText, [1, 2]);
    await checkPages(outputs[1], sourceText, [3, 4, 5]);
  });

  it("extracts pages 2 and 4 in source order, removing repeats", async () => {
    const request = await job("4, 2, 2-2", "five-pages.pdf");
    const sourceText = await pageText(request.files[0].data);
    const outputs = resultOutputs(await extractPages(request, progress));
    expect(outputs).toHaveLength(1);
    expect(outputs[0].name).toBe("extracted-pages.pdf");
    await checkPages(outputs[0], sourceText, [2, 4]);
  });

  it("supports 1-3, 7, 10-12 for both tools", async () => {
    const request = await job("1-3, 7, 10-12");
    const sourceText = await pageText(request.files[0].data);
    const split = resultOutputs(await splitPdf(request, progress));
    expect(split).toHaveLength(3);
    for (const [index, numbers] of [[1, 2, 3], [7], [10, 11, 12]].entries()) {
      await checkPages(split[index], sourceText, numbers);
    }
    await checkPages(resultOutputs(await extractPages(request, progress))[0], sourceText, [1, 2, 3, 7, 10, 11, 12]);
  });

  it("keeps requested split order and makes distinct files for overlapping ranges", async () => {
    const request = await job("3-4, 1-3, 3");
    const sourceText = await pageText(request.files[0].data);
    const outputs = resultOutputs(await splitPdf(request, progress));
    expect(new Set(outputs.map((output) => output.name)).size).toBe(3);
    for (const [index, numbers] of [[3, 4], [1, 2, 3], [3]].entries()) {
      await checkPages(outputs[index], sourceText, numbers);
    }
  });

  for (const [name, operation] of [["split", splitPdf], ["extract", extractPages]] as const) {
    it.each(["", "0", "5-2", "1-6", "2, 0"])(`${name} rejects %s before making output`, async (ranges) => {
      await expect(operation(await job(ranges, "five-pages.pdf"), progress)).rejects.toMatchObject({
        code: "invalid-options",
      });
    });

    it(`${name} requires one input and accepts a one-page PDF`, async () => {
      const request = await job("1", "invoice.pdf");
      const sourceText = await pageText(request.files[0].data);
      await checkPages(resultOutputs(await operation(request, progress))[0], sourceText, [1]);
      request.files.push(await readFixture("report.pdf"));
      await expect(operation(request, progress)).rejects.toMatchObject({ code: "invalid-options" });
      request.files = [];
      await expect(operation(request, progress)).rejects.toMatchObject({ code: "invalid-options" });
    });
  }
});
