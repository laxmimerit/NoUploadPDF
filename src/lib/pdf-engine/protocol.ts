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
  | "busy"
  | "cancelled"
  | "failed";

export type PdfResult = { name: string; mimeType: string; data: ArrayBuffer };

export type PdfReply =
  | { type: "progress"; id: string; value: number; message: string }
  | { type: "result"; id: string; result: PdfResult }
  | { type: "error"; id: string; code: PdfErrorCode; message: string };
