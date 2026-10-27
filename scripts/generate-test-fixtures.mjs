import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "@cantoo/pdf-lib";

const directory = new URL("../tests/fixtures/", import.meta.url);
const fixedDate = new Date("2026-01-01T00:00:00Z");

async function createDocument(title) {
  const document = await PDFDocument.create();
  document.setTitle(title);
  document.setAuthor("NoUploadPDF fictional test data");
  document.setCreator("NoUploadPDF fixture generator");
  document.setProducer("NoUploadPDF fixture generator");
  document.setCreationDate(fixedDate);
  document.setModificationDate(fixedDate);
  return document;
}

async function createInvoice() {
  const document = await createDocument("Fictional invoice - INV-TEST-001");
  const font = await document.embedFont(StandardFonts.Helvetica);
  const page = document.addPage([595, 842]);
  const lines = [
    "FICTIONAL INVOICE",
    "Invoice: INV-TEST-001 | Date: 2026-01-01",
    "From: Paper Moon Example Studio",
    "Bill to: Imaginary Orchard Workshop",
    "Sample notebook design: 2 x 25.00 = 50.00",
    "Sample poster layout: 1 x 40.00 = 40.00",
    "Total: 90.00 fictional credits",
    "Test data only. No real transaction or personal information.",
  ];
  lines.forEach((text, index) => page.drawText(text, {
    x: 48,
    y: 780 - index * 38,
    size: index === 0 ? 20 : 12,
    font,
    color: rgb(0.1, 0.2, 0.2),
  }));
  page.drawText("Page 1 of 1", { x: 48, y: 40, size: 10, font });
  return document;
}

await mkdir(directory, { recursive: true });

const invoice = await createInvoice();
await writeFile(new URL("invoice.pdf", directory), await invoice.save({ useObjectStreams: false }));

const report = await createDocument("Fictional twelve-page report");
const reportFont = await report.embedFont(StandardFonts.Helvetica);
for (let number = 1; number <= 12; number++) {
  const page = report.addPage([595, 842]);
  page.drawText("FICTIONAL ORCHARD REPORT", { x: 48, y: 780, size: 20, font: reportFont });
  page.drawText(`Section ${number}: Imaginary plot ${number}`, { x: 48, y: 726, size: 14, font: reportFont });
  page.drawText(`Sample harvest: ${number * 10} pretend baskets.`, { x: 48, y: 690, size: 12, font: reportFont });
  page.drawText("All names and figures are made up for testing.", { x: 48, y: 654, size: 12, font: reportFont });
  page.drawText(`Page ${number} of 12`, { x: 48, y: 40, size: 10, font: reportFont });
}
await writeFile(new URL("report.pdf", directory), await report.save({ useObjectStreams: false }));

// Keep the PDF signature, but truncate an object so the file cannot be parsed.
await writeFile(new URL("damaged.pdf", directory), "%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages\n");

const locked = await createInvoice();
locked.encrypt({ userPassword: "fixture-open", ownerPassword: "fixture-owner", algorithm: "AES-256" });
await writeFile(new URL("password-protected.pdf", directory), await locked.save());

await writeFile(new URL("renamed-text.pdf", directory),
  "This is a plain text test file with a .pdf extension. It is not a PDF.\n");

console.log("Generated five fictional fixtures in tests/fixtures.");
