import path from "node:path";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import { expect, test } from "@playwright/test";

for (const [slug, name] of [["split-pdf", "Split PDF"], ["extract-pages", "Extract pages"]]) {
  test(`${name} reports bad parts, retries, downloads PDFs, and resets`, async ({ page }) => {
    const documentRequests: string[] = [];
    page.on("request", (request) => {
      if (request.postDataBuffer()) documentRequests.push(request.url());
    });
    await page.goto(`/tools/${slug}`);
    const workspace = page.getByRole("region", { name: `${name} workspace`, exact: true });
    await workspace.getByLabel("Choose PDF files").setInputFiles(path.resolve("tests/fixtures/report.pdf"));
    const ranges = workspace.getByLabel("Page ranges", { exact: true });
    const process = workspace.getByRole("button", { name: "Process PDFs", exact: true });
    await expect(process).toBeEnabled();
    for (const [value, message] of [
      ["1-3, 0", "Part 2 (\u201c0\u201d): page numbers start at 1."],
      ["5-2", "Part 1 (\u201c5-2\u201d): the start page 5 is after the end page 2."],
      ["13", "Part 1 (\u201c13\u201d): this PDF has 12 pages"],
    ]) {
      await ranges.fill(value);
      await process.click();
      await expect(workspace.getByRole("alert")).toContainText(message);
      await expect(workspace.getByRole("button", { name: "Download", exact: true })).toBeDisabled();
    }
    await ranges.fill("1-3, 7, 10-12");
    await ranges.press("Tab");
    await process.press("Enter");
    const links = workspace.getByRole("link", { name: /^Download/ });
    const counts = slug === "split-pdf" ? [3, 1, 3] : [7];
    await expect(links).toHaveCount(counts.length);
    for (let index = 0; index < counts.length; index++) {
      const pending = page.waitForEvent("download");
      await links.nth(index).click();
      const download = await pending;
      const filename = await download.path();
      expect(filename).toBeTruthy();
      const pdf = await PDFDocument.load(await readFile(filename!));
      expect(pdf.getPageCount()).toBe(counts[index]);
    }
    expect(documentRequests).toEqual([]);
    await ranges.fill("2");
    await expect(links).toHaveCount(0);
    await page.setViewportSize({ width: 320, height: 700 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await workspace.getByRole("button", { name: "Start again" }).press("Enter");
    await expect(ranges).toHaveValue("");
    await expect(workspace.getByLabel("Choose PDF files")).toBeFocused();
  });
}
