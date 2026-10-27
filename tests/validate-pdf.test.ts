import { describe, expect, it } from "vitest";
import { PdfError } from "../src/lib/pdf-engine/errors";
import { validatePdf } from "../src/lib/pdf-engine/validate-pdf";
import { brokenFixtures, readFixture, validFixtures } from "./fixtures";

describe("PDF validation", () => {
  it.each(validFixtures)("reads $pages pages from $name", async ({ name, pages }) => {
    await expect(validatePdf(await readFixture(name))).resolves.toBe(pages);
  });

  it.each(brokenFixtures)("classifies $name as $code", async ({ name, code }) => {
    await expect(validatePdf(await readFixture(name))).rejects.toMatchObject({
      name: "PdfError",
      code,
      message: new PdfError(code).message,
    });
  });

  it("uses file contents even when a valid PDF has a non-PDF filename", async () => {
    const file = await readFixture("invoice.pdf");
    await expect(validatePdf({ ...file, name: "invoice.txt" })).resolves.toBe(1);
  });
});
