import { PDFDocument } from "@cantoo/pdf-lib";
import { PdfError, readablePdfError } from "./errors";
import type { PdfJob, PdfOutput } from "./protocol";

export async function mergePdf(
  job: PdfJob,
  progress: (value: number, message: string) => void,
): Promise<PdfOutput> {
  if (job.files.length < 2) throw new PdfError("too-few-files");
  if (Object.keys(job.options).length) throw new PdfError("invalid-options");
  const merged = await PDFDocument.create();
  for (let index = 0; index < job.files.length; index++) {
    try {
      const source = await PDFDocument.load(job.files[index].data, {
        updateMetadata: false,
        throwOnInvalidObject: true,
      });
      if (source.isEncrypted) throw new PdfError("password");
      if (!source.getPageCount()) throw new PdfError("damaged");
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    } catch (error) {
      throw readablePdfError(error);
    }
    progress(20 + Math.round(((index + 1) / job.files.length) * 70),
      `Merged ${index + 1} of ${job.files.length} PDFs on your device.`);
  }
  const bytes = await merged.save();
  const firstName = job.files[0].name.split(/[\\/]/).pop() ?? "";
  const base = firstName.replace(/\.pdf$/i, "").trim() || "document";
  progress(100, "Your merged PDF is ready.");
  return { name: `${base}-merged.pdf`, mimeType: "application/pdf", data: bytes.buffer as ArrayBuffer };
}
