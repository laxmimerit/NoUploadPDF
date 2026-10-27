import { compressPdf } from "./compress-pdf";
import { imagesToPdf } from "./images-to-pdf";
import { pdfToImages } from "./pdf-to-images";
import { pageNumbers } from "./page-numbers";
import { watermarkPdf } from "./watermark-pdf";
import { signPdf } from "./sign-pdf";
import { PdfError } from "./errors";
import { rotatePdf } from "./rotate-pdf";
import { reorderDelete } from "./reorder-delete";
import { mergePdf } from "./merge-pdf";
import { extractPages } from "./extract-pages";
import { resultOutputs } from "./protocol";
import type { PdfJob, PdfReply, PdfResult } from "./protocol";
import { splitPdf } from "./split-pdf";
import { validatePdf } from "./validate-pdf";

// This small port type avoids mixing the DOM and WebWorker TypeScript libraries.
const port = globalThis as unknown as {
  onmessage: ((event: MessageEvent<PdfJob>) => void) | null;
  postMessage: (reply: PdfReply, transfer?: Transferable[]) => void;
};

// Each tool gets its own operation file and an entry here.
type Operation = (job: PdfJob, progress: (value: number, message: string) => void) => Promise<PdfResult>;
const operations = new Map<string, Operation>([
  ["compress-pdf", compressPdf],
  ["images-to-pdf", imagesToPdf],
  ["pdf-to-images", pdfToImages],
  ["merge-pdf", mergePdf],
  ["rotate-pdf", rotatePdf],
  ["reorder-delete", reorderDelete],
  ["split-pdf", splitPdf],
  ["extract-pages", extractPages],
  ["page-numbers", pageNumbers],
  ["watermark-pdf", watermarkPdf],
  ["sign-pdf", signPdf],
]);
let running = false;

port.onmessage = async ({ data: job }) => {
  if (job.type !== "job") return;
  if (running) {
    const error = new PdfError("busy");
    port.postMessage({ type: "error", id: job.id, code: error.code, message: error.message });
    return;
  }
  running = true;
  const progress = (value: number, message: string) => {
    port.postMessage({ type: "progress", id: job.id, value, message });
  };
  try {
    if (!job.files.length) throw new PdfError("empty");
    progress(0, job.tool === "images-to-pdf" ? "Checking your images…" : "Checking your PDFs…");
    for (let index = 0; job.tool !== "images-to-pdf" && index < job.files.length; index++) {
      await validatePdf(job.files[index]);
      progress(Math.round(((index + 1) / job.files.length) * 20), "PDFs checked on your device.");
    }
    const operation = operations.get(job.tool);
    if (!operation) throw new PdfError("not-built");
    const result = await operation(job, progress);
    port.postMessage({ type: "result", id: job.id, result }, resultOutputs(result).map((output) => output.data));
  } catch (error) {
    const failure = error instanceof PdfError ? error : new PdfError("failed");
    port.postMessage({ type: "error", id: job.id, code: failure.code, message: failure.message });
  } finally {
    // Do not retain input buffers, document objects, or job options between jobs.
    job.files.length = 0;
    running = false;
  }
};
