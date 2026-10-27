import { PDFDocument } from "@cantoo/pdf-lib";
import { PdfError } from "./errors";
import { parsePageRanges, rangeIndices } from "./page-ranges";
import type { PdfJob, PdfOutput, PdfResult } from "./protocol";

export async function splitPdf(
  job: PdfJob,
  progress: (value: number, message: string) => void,
): Promise<PdfResult> {
  if (job.files.length !== 1) {
    throw new PdfError("invalid-options", "Choose exactly one PDF to split. Remove extra files and try again.");
  }
  const source = await PDFDocument.load(job.files[0].data, { updateMetadata: false });
  const ranges = parsePageRanges(job.options.ranges, source.getPageCount());
  const outputs: PdfOutput[] = [];
  for (const [index, range] of ranges.entries()) {
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, rangeIndices(range));
    pages.forEach((page) => output.addPage(page));
    const data = await output.save();
    const label = range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`;
    outputs.push({ name: `split-${index + 1}-pages-${label}.pdf`, mimeType: "application/pdf", data: data.buffer });
    progress(20 + Math.round(((index + 1) / ranges.length) * 80), `Created PDF ${index + 1} of ${ranges.length}.`);
  }
  return { outputs };
}
