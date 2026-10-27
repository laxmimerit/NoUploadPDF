import { describe, expect, it } from "vitest";
import { hasPdfHeader, PdfError, readablePdfError } from "../src/lib/pdf-engine/errors";
import type { PdfErrorCode } from "../src/lib/pdf-engine/protocol";

// Exact user-facing copy is deliberate: every error needs a plain recovery step.
const expectedMessages = {
  "not-pdf": "This file is not a PDF. Choose a PDF file and try again.",
  damaged: "This PDF is damaged or cannot be read. Export a fresh copy and choose it again.",
  password: "This PDF is locked with a password. Choose a copy without password protection.",
  "not-built": "This tool is not built yet. You can preview your PDFs here; come back later to process them.",
  empty: "Choose at least one PDF, then try again.",
  busy: "A job is already running. Wait for it to finish, or choose Start again.",
  cancelled: "The job was stopped. Choose your PDFs to start again.",
  "invalid-options": "Check the tool options, correct them, and try again.",
  failed: "The PDF could not be processed. Try fewer or smaller files, or choose Start again.",
} satisfies Record<PdfErrorCode, string>;

describe("plain PDF error messages", () => {
  it.each(Object.entries(expectedMessages))("shows recovery copy for %s", (code, message) => {
    const error = new PdfError(code as PdfErrorCode);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("PdfError");
    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
  });

  it("preserves an already classified application error", () => {
    const error = new PdfError("failed");
    expect(readablePdfError(error)).toBe(error);
  });

  it.each(["PasswordException", "EncryptedPDFError", "PASSWORD_REQUIRED"])(
    "turns %s into a password recovery message",
    (name) => {
      const error = new Error("Private parser details");
      error.name = name;
      expect(readablePdfError(error)).toMatchObject({ code: "password", message: expectedMessages.password });
    },
  );

  it.each([new Error("Internal parser details"), "raw failure", null, undefined])(
    "hides unknown parser failures behind the damaged message (%s)",
    (error) => {
      expect(readablePdfError(error)).toMatchObject({ code: "damaged", message: expectedMessages.damaged });
    },
  );
});

describe("PDF header check", () => {
  it("accepts a PDF header after a short prefix", () => {
    expect(hasPdfHeader(new TextEncoder().encode("prefix\n%PDF-1.7\n").buffer)).toBe(true);
  });

  it("rejects empty input and text without a PDF header", () => {
    expect(hasPdfHeader(new ArrayBuffer(0))).toBe(false);
    expect(hasPdfHeader(new TextEncoder().encode("Just text").buffer)).toBe(false);
  });

  it("does not search past the first 1024 bytes", () => {
    expect(hasPdfHeader(new TextEncoder().encode("x".repeat(1024) + "%PDF-1.7").buffer)).toBe(false);
  });
});
