import { PDFDocument } from "@cantoo/pdf-lib";
import { PdfError } from "./errors";
import { parsePageRanges, rangeIndices } from "./page-ranges";
import type { PdfJob, PdfResult } from "./protocol";

export async function extractPages(
  job: PdfJob,
  progress: (value: number, message: string) => void,
): Promise<PdfResult> {
  if (job.files.length !== 1) {
    throw new PdfError("invalid-options", "Choose exactly one PDF to extract from. Remove extra files and try again.");
  }
  const source = await PDFDocument.load(job.files[0].data, { updateMetadata: false });
  const ranges = parsePageRanges(job.options.ranges, source.getPageCount());
  const indices = [...new Set(ranges.flatMap(rangeIndices))].sort((left, right) => left - right);
  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, indices);
  pages.forEach((page) => output.addPage(page));
  progress(80, "Saving selected pages on your device…");
  const data = await output.save();
  return { name: "extracted-pages.pdf", mimeType: "application/pdf", data: data.buffer };
}
