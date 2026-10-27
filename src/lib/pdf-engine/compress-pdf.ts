import { PDFDict, PDFDocument, PDFName } from "@cantoo/pdf-lib";
import { scanPdf } from "./scan-pdf";
import { PdfError } from "./errors";
import { pageOutputName } from "./page-plan";
import type { PdfJob, PdfResult } from "./protocol";

export async function compressPdf(job: PdfJob, progress: (value: number, message: string) => void): Promise<PdfResult> {
  if (job.files.length !== 1 || !["cleanup", "scan"].includes(String(job.options.mode)) ||
      Object.keys(job.options).some((key) => key !== "mode" && key !== "quality") ||
      (job.options.mode === "cleanup" && Object.keys(job.options).length !== 1) ||
      (job.options.mode === "scan" && !["smaller", "clearer"].includes(String(job.options.quality)))) {
    throw new PdfError("invalid-options", "Choose one PDF and a compression mode and quality, then try again.");
  }
  const input = job.files[0];
  progress(30, "Cleaning up your PDF on this device…");
  const document = await PDFDocument.load(input.data, { updateMetadata: false, throwOnInvalidObject: true });
  // Rewriting a signed document would invalidate its signature. Keep its original bytes.
  const signed = document.context.enumerateIndirectObjects().some(([, object]) =>
    object instanceof PDFDict && object.has(PDFName.of("ByteRange")));
  if (signed) {
    progress(100, "This signed PDF was kept unchanged.");
    return { name: input.name, mimeType: "application/pdf", data: input.data };
  }
  if (job.options.mode === "scan") return scanPdf(job, progress);
  const bytes = await document.save({ useObjectStreams: true, updateFieldAppearances: false });
  const smaller = bytes.byteLength < input.data.byteLength;
  progress(100, smaller ? "Your cleaned PDF is ready." : "No size reduction was possible.");
  return {
    name: smaller ? pageOutputName(input.name, "compressed") : input.name,
    mimeType: "application/pdf",
    data: smaller ? bytes.buffer as ArrayBuffer : input.data,
  };
}
