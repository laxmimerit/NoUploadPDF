import type { PdfErrorCode } from "./protocol";

const passwordRecoveryMessage = "This PDF is locked with a password. Choose a copy without password protection.";

const messages: Record<PdfErrorCode, string> = {
  "not-pdf": "This file is not a PDF. Choose a PDF file and try again.",
  damaged: "This PDF is damaged or cannot be read. Export a fresh copy and choose it again.",
  password: passwordRecoveryMessage,
  "not-built": "This tool is not built yet. You can preview your PDFs here; come back later to process them.",
  empty: "Choose at least one PDF, then try again.",
  busy: "A job is already running. Wait for it to finish, or choose Start again.",
  cancelled: "The job was stopped. Choose your PDFs to start again.",
  "invalid-options": "Check the tool options, correct them, and try again.",
  failed: "The PDF could not be processed. Try fewer or smaller files, or choose Start again.",
};

export class PdfError extends Error {
  constructor(public readonly code: PdfErrorCode, detail?: string) {
    super(code === "invalid-options" && detail ? detail : messages[code]);
    this.name = "PdfError";
  }
}

export function readablePdfError(error: unknown): PdfError {
  if (error instanceof PdfError) return error;
  const name = error instanceof Error ? error.name : "";
  if (/password|encrypt/i.test(name)) return new PdfError("password");
  return new PdfError("damaged");
}

export function hasPdfHeader(data: ArrayBuffer): boolean {
  // Some valid PDFs have a short prefix before the PDF header.
  const prefix = new Uint8Array(data, 0, Math.min(data.byteLength, 1024));
  return new TextDecoder("latin1").decode(prefix).includes("%PDF-");
}
