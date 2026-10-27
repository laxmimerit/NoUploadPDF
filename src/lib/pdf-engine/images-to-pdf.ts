import { PDFDocument } from "@cantoo/pdf-lib";
import { PdfError } from "./errors";
import type { PdfJob, PdfResult } from "./protocol";

export async function imagesToPdf(job: PdfJob, progress: (value: number, message: string) => void): Promise<PdfResult> {
  if (Object.keys(job.options).length) throw new PdfError("invalid-options");
  const pdf = await PDFDocument.create();
  for (const [index, file] of job.files.entries()) {
    try {
      const bytes = new Uint8Array(file.data);
      const png = bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
      const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      if (!png && !jpeg) throw new Error("Unsupported image");
      // The browser applies EXIF orientation when decoding photographs.
      const bitmap = await createImageBitmap(new Blob([file.data], { type: png ? "image/png" : "image/jpeg" }));
      try {
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext("2d");
        if (!context || !bitmap.width || !bitmap.height) throw new Error("Unreadable image");
        context.drawImage(bitmap, 0, 0);
        const normalized = await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer();
        const image = await pdf.embedPng(normalized);
        const scale = Math.min(1, 14400 / Math.max(image.width, image.height));
        const width = image.width * scale;
        const height = image.height * scale;
        pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
      } finally {
        bitmap.close();
      }
    } catch {
      throw new PdfError("invalid-options", `${file.name} cannot be read. Choose a valid JPEG or PNG image and retry.`);
    }
    progress(Math.round((index + 1) / job.files.length * 90), `Added image ${index + 1} of ${job.files.length}.`);
  }
  const data = await pdf.save();
  const base = (job.files[0].name.split(/[\\/]/).pop() || "images").replace(/\.[^.]+$/, "") || "images";
  return { name: `${base}.pdf`, mimeType: "application/pdf", data: data.buffer };
}
