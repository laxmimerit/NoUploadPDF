import { degrees, PDFDocument } from "@cantoo/pdf-lib";
import { PdfError } from "./errors";
import { pageOutputName, pagePlan } from "./page-plan";
import type { PdfJob, PdfResult } from "./protocol";

export async function reorderDelete(
  job: PdfJob,
  progress: (value: number, message: string) => void,
): Promise<PdfResult> {
  if (job.files.length !== 1) {
    throw new PdfError("invalid-options", "Choose exactly one PDF to arrange. Remove extra files and try again.");
  }
  const source = await PDFDocument.load(job.files[0].data, { updateMetadata: false });
  const { order, rotations } = pagePlan(job, source.getPageCount(), true);
  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, order.map((number) => number - 1));
  pages.forEach((page, index) => {
    const turn = rotations[order[index] - 1];
    if (turn) page.setRotation(degrees(((page.getRotation().angle + turn) % 360 + 360) % 360));
    output.addPage(page);
  });
  const title = source.getTitle();
  if (title) output.setTitle(title);
  progress(80, "Saving pages in your chosen order on your device…");
  const data = await output.save();
  progress(100, "Your arranged PDF is ready.");
  return { name: pageOutputName(job.files[0].name, "reordered"), mimeType: "application/pdf", data: data.buffer };
}
