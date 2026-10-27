import { PDFDocument } from "@cantoo/pdf-lib";
import { pageOutputName } from "./page-plan";
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

export async function scanPdf(job: PdfJob, progress: (value: number, message: string) => void): Promise<PdfResult> {
  const input = job.files[0];
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  const loading = pdfjs.getDocument({
    data: input.data.slice(0), cMapUrl: "/pdfjs/cmaps/", cMapPacked: true,
    standardFontDataUrl: "/pdfjs/standard_fonts/", wasmUrl: "/pdfjs/wasm/", iccUrl: "/pdfjs/iccs/",
    useWorkerFetch: false, disableFontFace: true, CanvasFactory: WorkerCanvasFactory,
  });
  try {
    const source = await loading.promise;
    const output = await PDFDocument.create();
    const scale = job.options.quality === "clearer" ? 1.5 : 1;
    const quality = job.options.quality === "clearer" ? 0.82 : 0.6;
    for (let index = 1; index <= source.numPages; index++) {
      const page = await source.getPage(index);
      const original = page.getViewport({ scale: 1 });
      // Limit memory for unusually large pages while keeping their PDF dimensions unchanged.
      const boundedScale = Math.min(scale, Math.sqrt(16000000 / (original.width * original.height)));
      const viewport = page.getViewport({ scale: boundedScale });
      const canvas = new OffscreenCanvas(Math.max(1, Math.ceil(viewport.width)), Math.max(1, Math.ceil(viewport.height)));
      try {
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise;
        const image = await output.embedJpg(await (await canvas.convertToBlob({ type: "image/jpeg", quality })).arrayBuffer());
        const resultPage = output.addPage([original.width, original.height]);
        resultPage.drawImage(image, { x: 0, y: 0, width: original.width, height: original.height });
      } finally {
        canvas.width = canvas.height = 0;
        page.cleanup();
      }
      progress(20 + Math.round(index / source.numPages * 75), `Scanned page ${index} of ${source.numPages}.`);
    }
    const bytes = await output.save();
    const smaller = bytes.byteLength < input.data.byteLength;
    progress(100, smaller ? "Your scanned PDF is ready." : "No size reduction was possible.");
    return { name: smaller ? pageOutputName(input.name, "compressed") : input.name, mimeType: "application/pdf",
      data: smaller ? bytes.buffer as ArrayBuffer : input.data };
  } finally {
    await loading.destroy();
  }
}
