import { PDFDocument } from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";
import { rotatePdf } from "../src/lib/pdf-engine/rotate-pdf";
import { reorderDelete } from "../src/lib/pdf-engine/reorder-delete";
import { resultOutputs, type PdfJob, type PdfOptions } from "../src/lib/pdf-engine/protocol";
import { readFixture } from "./fixtures";
import { pageTexts } from "./pdf-output";

const operations = [rotatePdf, reorderDelete];
async function mixedJob(): Promise<PdfJob> {
  const file = await readFixture("four-pages.pdf");
  return { type: "job", id: "pages", tool: "rotate-pdf", files: [file],
    options: { order: [1, 2, 3, 4], rotations: [0, 0, 0, 0] } };
}
const progress = () => {};

describe("page grid PDF operations", () => {
  it.each([90, 180, 270])("adds %i degrees to the current turn and keeps other pages intact", async (turn) => {
    const job = await mixedJob();
    job.files[0].name = "report.PDF";
    job.options.rotations = [0, turn, 0, 0];
    const original = await PDFDocument.load(job.files[0].data);
    const text = await pageTexts(job.files[0].data.slice(0));
    const [result] = resultOutputs(await rotatePdf(job, progress));
    const output = await PDFDocument.load(result.data);
    expect(result.name).toBe("report-rotated.pdf");
    expect(output.getPageCount()).toBe(4);
    expect(output.getPages().map((page) => page.getRotation().angle)).toEqual([0, (90 + turn) % 360, 180, 270]);
    expect(output.getPages().map((page) => page.getSize())).toEqual(original.getPages().map((page) => page.getSize()));
    expect(await pageTexts(result.data.slice(0))).toEqual(text);
  });

  it("reorders to 4, 2, 1, removes page 3, and keeps each page's turn and content", async () => {
    const job = await mixedJob();
    job.options = { order: [4, 2, 1], rotations: [0, 90, 0, 0] };
    const expected = await pageTexts(job.files[0].data.slice(0));
    const [result] = resultOutputs(await reorderDelete(job, progress));
    const output = await PDFDocument.load(result.data);
    expect(result.name).toBe("four-pages-reordered.pdf");
    expect(output.getPages().map((page) => page.getRotation().angle)).toEqual([270, 180, 0]);
    expect(await pageTexts(result.data.slice(0))).toEqual([expected[3], expected[1], expected[0]]);
    expect(output.getTitle()).toBe("Fictional four-page mixed-orientation report");
  });

  it("supports a one-page PDF and a complete turn returning to the original orientation", async () => {
    const job = await mixedJob();
    job.files = [await readFixture("invoice.pdf")];
    job.options = { order: [1], rotations: [0] };
    for (const operation of operations) {
      const [output] = resultOutputs(await operation(job, progress));
      expect((await PDFDocument.load(output.data)).getPageCount()).toBe(1);
      expect(await pageTexts(output.data.slice(0))).toEqual(await pageTexts(job.files[0].data.slice(0)));
    }
  });

  it.each(operations)("rejects invalid page edits and file counts with recovery messages", async (operation) => {
    const job = await mixedJob();
    const invalidOptions: PdfOptions[] = [
      {}, { order: [], rotations: [0, 0, 0, 0] },
      { order: [1, 1], rotations: [0, 0, 0, 0] }, { order: [0], rotations: [0, 0, 0, 0] },
      { order: [5], rotations: [0, 0, 0, 0] }, { order: [1.5], rotations: [0, 0, 0, 0] },
      { order: [1, 2, 3, 4], rotations: [0, 45, 0, 0] },
      { order: [1, 2, 3, 4], rotations: [0, 360, 0, 0] },
      { order: [1, 2, 3, 4], rotations: [0] },
      { order: [1, 2, 3, 4], rotations: [0, 0, 0, 0], unsupported: true },
    ];
    for (const options of invalidOptions) {
      job.options = options;
      await expect(operation(job, progress)).rejects.toMatchObject({
        code: "invalid-options", message: expect.stringContaining("Reset page edits and try again."),
      });
    }
    job.files = [];
    await expect(operation(job, progress)).rejects.toMatchObject({ code: "invalid-options" });
  });

  it("prevents rotation from deleting or reordering pages", async () => {
    const job = await mixedJob();
    for (const order of [[2, 1, 3, 4], [1]]) {
      job.options.order = order;
      await expect(rotatePdf(job, progress)).rejects.toMatchObject({ code: "invalid-options" });
    }
  });
});
