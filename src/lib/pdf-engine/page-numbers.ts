import { PDFDocument, rgb, StandardFonts } from "@cantoo/pdf-lib";
import { PdfError } from "./errors";
import { pageOutputName } from "./page-plan";
import type { PdfJob, PdfResult } from "./protocol";
import { textMetrics, visiblePage } from "./text-placement";

export async function pageNumbers(
  job: PdfJob,
  progress: (value: number, message: string) => void,
): Promise<PdfResult> {
  if (job.files.length !== 1) {
    throw new PdfError("invalid-options", "Choose exactly one PDF to number. Remove extra files and try again.");
  }
  const { position, startNumber } = job.options;
  if (Object.keys(job.options).some((key) => !["position", "startNumber"].includes(key))
    || !["bottom-center", "bottom-right", "top-right"].includes(String(position))) {
    throw new PdfError("invalid-options", "Choose bottom centre, bottom right, or top right and try again.");
  }
  if (typeof startNumber !== "number" || !Number.isSafeInteger(startNumber)) {
    throw new PdfError("invalid-options",
      "Enter a whole starting number, including zero or a negative number, and try again.");
  }
  const source = await PDFDocument.load(job.files[0].data, { updateMetadata: false });
  if (startNumber > Number.MAX_SAFE_INTEGER - (source.getPageCount() - 1)) {
    throw new PdfError("invalid-options",
      "Use a smaller starting number so every page number stays precise, then try again.");
  }
  const font = await source.embedFont(StandardFonts.Helvetica);
  source.getPages().forEach((page, index) => {
    const view = visiblePage(page);
    const margin = Math.min(24, view.width / 10, view.height / 10);
    const text = String(startNumber + index);
    const unit = textMetrics(font, text, 1);
    const size = Math.min(12, (view.width - margin * 2) / unit.width,
      (view.height - margin * 2) / (unit.ascent + unit.descent));
    if (size < 6) {
      throw new PdfError("invalid-options",
        "A page is too small for readable numbers. Choose a larger-page PDF and try again.");
    }
    const metrics = textMetrics(font, text, size);
    const x = position === "bottom-center" ? (view.width - metrics.width) / 2 : view.width - margin - metrics.width;
    const y = position === "top-right" ? view.height - margin - metrics.ascent : margin + metrics.descent;
    page.drawText(text, { ...view.point(x, y), size, font, color: rgb(0.12, 0.12, 0.12), rotate: view.angle() });
    progress(20 + Math.round(((index + 1) / source.getPageCount()) * 60), "Adding page numbers on your device…");
  });
  const data = await source.save();
  progress(100, "Your numbered PDF is ready.");
  return { name: pageOutputName(job.files[0].name, "numbered"), mimeType: "application/pdf", data: data.buffer };
}
