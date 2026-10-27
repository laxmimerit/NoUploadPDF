import { zipSync } from "fflate";
import { PdfError } from "./errors";
import { parsePageRanges, rangeIndices } from "./page-ranges";
import type { PdfJob, PdfResult } from "./protocol";

class WorkerCanvasFactory {
  create(width: number, height: number) {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    return { canvas, context };
  }
  reset(target: { canvas: OffscreenCanvas }, width: number, height: number) {
    target.canvas.width = width;
    target.canvas.height = height;
  }
  destroy(target: { canvas: OffscreenCanvas | null; context: OffscreenCanvasRenderingContext2D | null }) {
    if (target.canvas) target.canvas.width = target.canvas.height = 0;
    target.canvas = null;
    target.context = null;
  }
}

export async function pdfToImages(job: PdfJob, progress: (value: number, message: string) => void): Promise<PdfResult> {
  if (job.files.length !== 1 || Object.keys(job.options).some((key) => key !== "ranges")) {
    throw new PdfError("invalid-options", "Choose one PDF and valid page ranges.");
  }
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  const loading = pdfjs.getDocument({
    data: job.files[0].data,
    cMapUrl: "/pdfjs/cmaps/", cMapPacked: true, standardFontDataUrl: "/pdfjs/standard_fonts/",
    wasmUrl: "/pdfjs/wasm/", iccUrl: "/pdfjs/iccs/", useWorkerFetch: false,
    disableFontFace: true, CanvasFactory: WorkerCanvasFactory,
  });
  try {
    const pdf = await loading.promise;
    const ranges = job.options.ranges;
    const pages = typeof ranges === "string" && !ranges.trim()
      ? Array.from({ length: pdf.numPages }, (_, i) => i)
      : [...new Set(parsePageRanges(ranges, pdf.numPages).flatMap(rangeIndices))].sort((a, b) => a - b);
    const base = (job.files[0].name.split(/[\\/]/).pop() || "document").replace(/\.pdf$/i, "") || "document";
    const images: Record<string, Uint8Array> = {};
    for (const [index, pageIndex] of pages.entries()) {
      const page = await pdf.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      try {
        await page.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise;
        const blob = await canvas.convertToBlob({ type: "image/png" });
        images[`${base}-page-${pageIndex + 1}.png`] = new Uint8Array(await blob.arrayBuffer());
      } finally {
        canvas.width = canvas.height = 0;
        page.cleanup();
      }
      progress(20 + Math.round((index + 1) / pages.length * 75), `Rendered page ${index + 1} of ${pages.length}.`);
    }
    if (pages.length === 1) {
      const name = Object.keys(images)[0];
      return { name, mimeType: "image/png", data: images[name].buffer as ArrayBuffer };
    }
    const data = zipSync(images, { level: 0 });
    return { name: `${base}.zip`, mimeType: "application/zip", data: data.buffer as ArrayBuffer };
  } finally {
    await loading.destroy();
  }
}
