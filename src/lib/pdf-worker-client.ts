import { PdfError } from "./pdf-engine/errors";
import type { PdfJob, PdfReply, PdfResult } from "./pdf-engine/protocol";

export interface PdfEngine {
  run: (
    job: Omit<PdfJob, "type" | "id">,
    onProgress: (value: number, message: string) => void,
    retainBuffers?: boolean,
  ) => Promise<PdfResult>;
  dispose: () => void;
}

export function createPdfEngine(): PdfEngine {
  let worker: Worker | undefined;
  let active: { id: string; reject: (error: Error) => void } | undefined;

  function dispose() {
    worker?.terminate();
    worker = undefined;
    active?.reject(new PdfError("cancelled"));
    active = undefined;
  }

  return {
    dispose,
    run(job, onProgress, retainBuffers = false) {
      if (active) return Promise.reject(new PdfError("busy"));
      return new Promise<PdfResult>((resolve, reject) => {
        try {
          worker ??= new Worker(new URL("./pdf-engine/worker.ts", import.meta.url), { type: "module" });
          const id = crypto.randomUUID();
          active = { id, reject };
          worker.onmessage = ({ data: reply }: MessageEvent<PdfReply>) => {
            if (reply.id !== active?.id) return;
            if (reply.type === "progress") {
              onProgress(reply.value, reply.message);
              return;
            }
            active = undefined;
            if (reply.type === "result") resolve(reply.result);
            else reject(new PdfError(reply.code, reply.message));
          };
          const fail = () => {
            const pending = active;
            active = undefined;
            worker?.terminate();
            worker = undefined;
            pending?.reject(new PdfError("failed"));
          };
          worker.onerror = fail;
          worker.onmessageerror = fail;
          // Transfer ownership by default. Copy only when the caller still needs these buffers.
          const transfer = retainBuffers ? [] : job.files.map((file) => file.data);
          worker.postMessage({ ...job, type: "job", id } satisfies PdfJob, transfer);
        } catch {
          active = undefined;
          worker?.terminate();
          worker = undefined;
          reject(new PdfError("failed"));
        }
      });
    },
  };
}
