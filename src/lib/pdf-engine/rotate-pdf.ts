import { degrees, PDFDocument } from "@cantoo/pdf-lib";
import { PdfError } from "./errors";
import { pageOutputName, pagePlan } from "./page-plan";
import type { PdfJob, PdfResult } from "./protocol";

export async function rotatePdf(
  job: PdfJob,
  progress: (value: number, message: string) => void,
): Promise<PdfResult> {
  if (job.files.length !== 1) {
    throw new PdfError("invalid-options", "Choose exactly one PDF to rotate. Remove extra files and try again.");
  }
  const source = await PDFDocument.load(job.files[0].data, { updateMetadata: false });
  const { rotations } = pagePlan(job, source.getPageCount(), false);
  source.getPages().forEach((page, index) => {
    if (rotations[index]) page.setRotation(degrees(((page.getRotation().angle + rotations[index]) % 360 + 360) % 360));
  });
  progress(80, "Saving turned pages on your device…");
  const data = await source.save();
  progress(100, "Your rotated PDF is ready.");
  return { name: pageOutputName(job.files[0].name, "rotated"), mimeType: "application/pdf", data: data.buffer };
}
