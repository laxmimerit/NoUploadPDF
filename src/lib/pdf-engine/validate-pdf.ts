import { EncryptedPDFError, PDFDocument } from "@cantoo/pdf-lib";
import { hasPdfHeader, PdfError, readablePdfError } from "./errors";
import type { PdfInput } from "./protocol";

export async function validatePdf(file: PdfInput): Promise<number> {
  if (!hasPdfHeader(file.data)) throw new PdfError("not-pdf");
  try {
    const document = await PDFDocument.load(file.data, {
      updateMetadata: false,
      throwOnInvalidObject: true,
    });
    if (document.isEncrypted) throw new PdfError("password");
    const pages = document.getPageCount();
    if (pages === 0) throw new PdfError("damaged");
    return pages;
  } catch (error) {
    if (error instanceof EncryptedPDFError) throw new PdfError("password");
    // Encrypted object streams can fail strict parsing before the encryption check.
    // A tolerant read is used only to identify encryption, never to accept a damaged PDF.
    try {
      const document = await PDFDocument.load(file.data, {
        ignoreEncryption: true,
        updateMetadata: false,
        warnOnInvalidObjects: false,
      });
      if (document.isEncrypted) throw new PdfError("password");
    } catch (classification) {
      if (classification instanceof PdfError) throw classification;
    }
    throw readablePdfError(error);
  }
}
