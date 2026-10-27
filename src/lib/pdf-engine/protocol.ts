export type PdfOptions = Record<string, string | number | boolean | number[]>;

export type PdfInput = { name: string; data: ArrayBuffer };

export type PdfJob = {
  type: "job";
  id: string;
  tool: string;
  files: PdfInput[];
  options: PdfOptions;
};

export type PdfErrorCode =
  | "not-pdf"
  | "damaged"
  | "password"
  | "not-built"
  | "empty"
  | "invalid-options"
  | "too-few-files"
  | "busy"
  | "cancelled"
  | "failed";

export type PdfOutput = { name: string; mimeType: string; data: ArrayBuffer };
export type PdfResult = PdfOutput | { outputs: PdfOutput[] };

export function resultOutputs(result: PdfResult): PdfOutput[] {
  return "outputs" in result ? result.outputs : [result];
}

export type PdfReply =
  | { type: "progress"; id: string; value: number; message: string }
  | { type: "result"; id: string; result: PdfResult }
  | { type: "error"; id: string; code: PdfErrorCode; message: string };
