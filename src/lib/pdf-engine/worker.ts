import { PdfError } from "./errors";
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

type Operation = (job: PdfJob, progress: (value: number, message: string) => void) => Promise<PdfResult>;
const operations = new Map<string, Operation>([
  ["split-pdf", splitPdf],
  ["extract-pages", extractPages],
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
    progress(0, "Checking your PDFs…");
    for (let index = 0; index < job.files.length; index++) {
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
