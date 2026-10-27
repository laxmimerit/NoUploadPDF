import { mkdir, writeFile } from "node:fs/promises";
import { degrees, PDFDocument, StandardFonts, rgb } from "@cantoo/pdf-lib";

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

for (const [name, count] of [["merge-two", 2], ["merge-three", 3]]) {
  const document = await createDocument(`Fictional ${name} document`);
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (let number = 1; number <= count; number++) {
    const page = document.addPage([595, 842]);
    page.drawText(`${name} - page ${number}`, { x: 48, y: 780, size: 24, font });
    page.drawText("Fictional merge fixture. No personal information.", { x: 48, y: 720, size: 12, font });
  }
  await writeFile(new URL(`${name}.pdf`, directory), await document.save({ useObjectStreams: false }));
}

const fivePages = await createDocument("Fictional five-page report");
const firstFive = await fivePages.copyPages(report, [0, 1, 2, 3, 4]);
firstFive.forEach((page) => fivePages.addPage(page));
await writeFile(new URL("five-pages.pdf", directory), await fivePages.save({ useObjectStreams: false }));

const fourPages = await createDocument("Fictional four-page mixed-orientation report");
const firstFour = await fourPages.copyPages(report, [0, 1, 2, 3]);
firstFour.forEach((page, index) => {
  page.setRotation(degrees(index * 90));
  fourPages.addPage(page);
});
await writeFile(new URL("four-pages.pdf", directory), await fourPages.save({ useObjectStreams: false }));

const overlayPages = await createDocument("Fictional three-page overlay placement report");
const overlayFont = await overlayPages.embedFont(StandardFonts.Helvetica);
for (const [index, size] of [[0, [595, 842]], [1, [842, 595]], [2, [650, 900]]]) {
  const page = overlayPages.addPage(size);
  page.drawText(`Overlay fixture page ${index + 1}`, { x: 80, y: 420, size: 18, font: overlayFont });
  page.drawText("Original fictional content stays readable.", { x: 80, y: 380, size: 12, font: overlayFont });
  if (index === 2) {
    page.setCropBox(40, 60, 550, 780);
    page.setRotation(degrees(90));
  }
}
await writeFile(new URL("overlay-pages.pdf", directory), await overlayPages.save({ useObjectStreams: false }));

// Keep the PDF signature, but truncate an object so the file cannot be parsed.
await writeFile(new URL("damaged.pdf", directory), "%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages\n");

const locked = await createInvoice();
locked.encrypt({ userPassword: "fixture-open", ownerPassword: "fixture-owner", algorithm: "AES-256" });
await writeFile(new URL("password-protected.pdf", directory), await locked.save());

await writeFile(new URL("renamed-text.pdf", directory),
  "This is a plain text test file with a .pdf extension. It is not a PDF.\n");



// Fictional scanned pages: high-resolution, image-only pages with distinct colors and labels.
const { createCanvas } = await import("@napi-rs/canvas");
const scanned = await createDocument("Fictional scanned pages");
for (const [label, color] of [["SCAN PAGE ONE", "#9c2c2c"], ["SCAN PAGE TWO", "#174c9c"]]) {
  const canvas = createCanvas(1200, 1600);
  const context = canvas.getContext("2d");
  context.fillStyle = "white";
  context.fillRect(0, 0, 1200, 1600);
  context.fillStyle = color;
  context.fillRect(100, 100, 1000, 200);
  context.fillStyle = "black";
  context.font = "70px sans-serif";
  context.fillText(label, 120, 450);
  const image = await scanned.embedPng(canvas.toBuffer("image/png"));
  scanned.addPage([300, 400]).drawImage(image, { x: 0, y: 0, width: 300, height: 400 });
}
await writeFile(new URL("scanned.pdf", directory), await scanned.save({ useObjectStreams: false }));

console.log("Generated fictional fixtures in tests/fixtures.");
