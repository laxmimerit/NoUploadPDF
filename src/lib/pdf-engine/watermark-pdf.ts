import { PDFDocument, rgb, StandardFonts } from "@cantoo/pdf-lib";
import { PdfError } from "./errors";
import { pageOutputName } from "./page-plan";
import { parsePageRanges, rangeIndices } from "./page-ranges";
import type { PdfJob, PdfResult } from "./protocol";
import { textMetrics, visiblePage } from "./text-placement";

export async function watermarkPdf(
  job: PdfJob,
  progress: (value: number, message: string) => void,
): Promise<PdfResult> {
  if (job.files.length !== 1) {
    throw new PdfError("invalid-options", "Choose exactly one PDF to watermark. Remove extra files and try again.");
  }
  const { text, ranges, position, opacity } = job.options;
  const invalid = (message: string): never => {
    throw new PdfError("invalid-options", `${message} Correct it and try again.`);
  };
  if (Object.keys(job.options).some((key) => !["text", "ranges", "position", "opacity"].includes(key))) {
    invalid("These watermark options are not supported.");
  }
  if (typeof text !== "string" || !text.trim() || text.length > 200 || /[\x00-\x1f\x7f]/.test(text)) {
    return invalid("Enter watermark text on one line, using 1 to 200 characters.");
  }
  if (typeof ranges !== "string") return invalid("Enter page ranges or leave the pages field empty for all pages.");
  if (!["center", "diagonal"].includes(String(position))) return invalid("Choose a centre or diagonal watermark.");
  if (typeof opacity !== "number" || !Number.isFinite(opacity) || opacity < 0.05 || opacity > 0.5) {
    return invalid("Choose an opacity from 5% to 50% so the document stays readable.");
  }
  const source = await PDFDocument.load(job.files[0].data, { updateMetadata: false });
  const indices = ranges.trim()
    ? [...new Set(parsePageRanges(ranges, source.getPageCount()).flatMap(rangeIndices))]
    : source.getPageIndices();
  const font = await source.embedFont(StandardFonts.HelveticaBold);
  const characters = new Set(font.getCharacterSet());
  if ([...text].some((character) => !characters.has(character.codePointAt(0)!))) {
    return invalid("Use Latin letters, numbers, and supported punctuation; some entered characters cannot be drawn.");
  }
  indices.forEach((index, number) => {
    const page = source.getPage(index);
    const view = visiblePage(page);
    const angle = position === "diagonal" ? 45 : 0;
    const radians = angle * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const unit = textMetrics(font, text, 1);
    const unitHeight = unit.ascent + unit.descent;
    const margin = Math.min(24, view.width / 10, view.height / 10);
    const size = Math.min(48, (view.width - margin * 2) / (unit.width * cos + unitHeight * sin),
      (view.height - margin * 2) / (unit.width * sin + unitHeight * cos));
    if (size < 6) return invalid("The watermark is too long for a page. Shorten the text or choose a larger-page PDF.");
    const metrics = textMetrics(font, text, size);
    const centerY = (metrics.ascent - metrics.descent) / 2;
    const x = view.width / 2 - metrics.width / 2 * cos + centerY * sin;
    const y = view.height / 2 - metrics.width / 2 * sin - centerY * cos;
    page.drawText(text, { ...view.point(x, y), font, size, rotate: view.angle(angle), opacity,
      color: rgb(0.3, 0.3, 0.3) });
    progress(20 + Math.round(((number + 1) / indices.length) * 60), "Adding your watermark on this device…");
  });
  const data = await source.save();
  progress(100, "Your watermarked PDF is ready.");
  return { name: pageOutputName(job.files[0].name, "watermarked"), mimeType: "application/pdf", data: data.buffer };
}
