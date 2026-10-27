import { PDFDocument } from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";
import { extractPages } from "../src/lib/pdf-engine/extract-pages";
import { mergePdf } from "../src/lib/pdf-engine/merge-pdf";
import { reorderDelete } from "../src/lib/pdf-engine/reorder-delete";
import { rotatePdf } from "../src/lib/pdf-engine/rotate-pdf";
import { splitPdf } from "../src/lib/pdf-engine/split-pdf";
import { resultOutputs, type PdfJob } from "../src/lib/pdf-engine/protocol";
import { readFixture } from "./fixtures";
import { pageTexts } from "./pdf-output";

async function pageStates(data: ArrayBuffer) {
  const document = await PDFDocument.load(data);
  const text = await pageTexts(data.slice(0));
  return document.getPages().map((page, index) => ({
    mediaBox: page.getMediaBox(),
    cropBox: page.getCropBox(),
    rotation: page.getRotation().angle,
    text: text[index],
  }));
}

async function request(tool: string, options: PdfJob["options"]): Promise<PdfJob> {
  return { type: "job", id: "preserve-pages", tool, options, files: [await readFixture("overlay-pages.pdf")] };
}

describe("Organize tools preserve mixed page geometry and content", () => {
  it("merges more than two PDFs without flattening crop boxes or existing rotations", async () => {
    const job = await request("merge-pdf", {});
    job.files.push(await readFixture("four-pages.pdf"), await readFixture("invoice.pdf"));
    const expected = (await Promise.all(job.files.map((file) => pageStates(file.data)))).flat();
    const result = await mergePdf(job, () => {});
    expect(result.name).toBe("overlay-pages-merged.pdf");
    expect(expected).toHaveLength(8);
    expect(await pageStates(result.data)).toEqual(expected);
  });

  it("splits repeated cropped pages into independent outputs with their original geometry", async () => {
    const job = await request("split-pdf", { ranges: "3, 1-2, 3" });
    const source = await pageStates(job.files[0].data);
    const outputs = resultOutputs(await splitPdf(job, () => {}));
    expect(outputs.map((output) => output.name)).toEqual([
      "split-1-pages-3.pdf", "split-2-pages-1-2.pdf", "split-3-pages-3.pdf",
    ]);
    expect(outputs[0].data).not.toBe(outputs[2].data);
    expect(await Promise.all(outputs.map((output) => pageStates(output.data))))
      .toEqual([[source[2]], source.slice(0, 2), [source[2]]]);
  });

  it("extracts deduplicated cropped pages in source order without changing their geometry", async () => {
    const job = await request("extract-pages", { ranges: "3, 1, 3" });
    const source = await pageStates(job.files[0].data);
    const [output] = resultOutputs(await extractPages(job, () => {}));
    expect(await pageStates(output.data)).toEqual([source[0], source[2]]);
  });

  it("turns mixed-size cropped pages additively while preserving their content and page boxes", async () => {
    const job = await request("rotate-pdf", { order: [1, 2, 3], rotations: [90, 180, 270] });
    const source = await pageStates(job.files[0].data);
    const [output] = resultOutputs(await rotatePdf(job, () => {}));
    expect(await pageStates(output.data)).toEqual(source.map((page, index) => ({
      ...page, rotation: (page.rotation + [90, 180, 270][index]) % 360,
    })));
  });

  it("keeps crop boxes and turns attached to source pages when arranging and deleting", async () => {
    const job = await request("reorder-delete", { order: [3, 1], rotations: [180, 0, 90] });
    const source = await pageStates(job.files[0].data);
    const [output] = resultOutputs(await reorderDelete(job, () => {}));
    expect(await pageStates(output.data)).toEqual([
      { ...source[2], rotation: (source[2].rotation + 90) % 360 },
      { ...source[0], rotation: (source[0].rotation + 180) % 360 },
    ]);
  });
});
