import { describe, expect, it } from "vitest";
import { mergePdf } from "../src/lib/pdf-engine/merge-pdf";
import type { PdfJob } from "../src/lib/pdf-engine/protocol";
import { readFixture } from "./fixtures";
import { pageTexts } from "./pdf-output";

async function request(names = ["merge-two.pdf", "merge-three.pdf"]): Promise<PdfJob> {
  return { type: "job", id: "merge-test", tool: "merge-pdf",
    files: await Promise.all(names.map(readFixture)), options: {} };
}

describe("Merge PDF", () => {
  it.each([
    ["merge-two.pdf", "merge-three.pdf"],
    ["merge-three.pdf", "merge-two.pdf"],
  ])("keeps every page's visible content in file order: %s then %s", async (first, second) => {
    const job = await request([first, second]);
    const expected = (await Promise.all(job.files.map((file) => pageTexts(file.data.slice(0))))).flat();
    const result = await mergePdf(job, () => {});
    expect(result.name).toBe(first.replace(".pdf", "-merged.pdf"));
    expect(result.mimeType).toBe("application/pdf");
    const texts = await pageTexts(result.data);
    expect(texts).toHaveLength(5);
    expect(texts).toEqual(expected);
    expect(texts.every((text) => text.includes("Fictional merge fixture."))).toBe(true);
  });

  it.each(["report.pdf", "report.PDF", "quarterly.report.pdf", ".pdf"])(
    "names the result from the first input: %s", async (name) => {
      const job = await request();
      job.files[0].name = name;
      const result = await mergePdf(job, () => {});
      expect(result.name).toBe(`${name.replace(/\.pdf$/i, "") || "document"}-merged.pdf`);
    },
  );

  it("rejects too few files", async () => {
    await expect(mergePdf(await request(["invoice.pdf"]), () => {}))
      .rejects.toMatchObject({ code: "too-few-files" });
  });

  it("rejects unsupported options", async () => {
    const job = await request();
    job.options = { pages: [1] };
    await expect(mergePdf(job, () => {})).rejects.toMatchObject({ code: "invalid-options" });
  });
});
