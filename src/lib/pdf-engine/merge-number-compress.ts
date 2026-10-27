import { compressPdf } from "./compress-pdf";
import { PdfError } from "./errors";
import { mergePdf } from "./merge-pdf";
import { pageNumbers } from "./page-numbers";
import { resultOutputs } from "./protocol";
import type { PdfJob, PdfOutput, PdfResult } from "./protocol";

export function stepError(step: string, error: unknown): PdfError {
  const failure = error instanceof PdfError ? error : new PdfError("failed");
  return new PdfError(failure.code, `${step}: ${failure.message}`);
}

export async function mergeNumberCompress(
  job: PdfJob,
  progress: (value: number, message: string) => void,
): Promise<PdfOutput> {
  async function runStep(
    step: string, start: number, operation: (report: (value: number, message: string) => void) => Promise<PdfResult>,
  ): Promise<PdfOutput> {
    progress(start, `${step}…`);
    try {
      const result = await operation((value, message) => {
        progress(start + Math.round(Math.max(0, Math.min(100, value)) * 0.26), `${step}: ${message}`);
      });
      const outputs = resultOutputs(result);
      if (outputs.length !== 1) throw new PdfError("failed");
      return outputs[0];
    } catch (error) {
      throw stepError(step, error);
    }
  }

  const merged = await runStep("Merge PDF", 20, (report) => mergePdf({ ...job, options: {} }, report));
  const numbered = await runStep("Page numbers", 47, (report) => pageNumbers({
    ...job, files: [merged], options: { startNumber: 1, position: "bottom-center" },
  }, report));
  const compressed = await runStep("Compress PDF", 74, (report) => compressPdf({
    ...job, files: [numbered], options: job.options,
  }, report));
  progress(100, "Your merged, numbered PDF is ready.");
  return { ...compressed, compressionInputSize: numbered.data.byteLength };
}
