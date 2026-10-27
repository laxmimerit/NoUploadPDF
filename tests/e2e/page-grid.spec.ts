import path from "node:path";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import { expect, test } from "@playwright/test";
import { pageTexts } from "../pdf-output";

for (const [slug, name, action] of [
  ["rotate-pdf", "Rotate PDF", "Save rotated PDF"], ["reorder-delete", "Reorder & delete", "Save PDF"],
]) {
  test(`${name} edits, downloads, invalidates, resets, and stays local in both themes`, async ({ page }) => {
    const sentBodies: string[] = [];
    page.on("request", (request) => { if (request.postDataBuffer()) sentBodies.push(request.url()); });
    await page.goto(`/tools/${slug}`);
    const workspace = page.getByRole("region", { name: `${name} workspace`, exact: true });
    const picker = workspace.getByLabel("Choose PDF files");
    await picker.setInputFiles(path.resolve("tests/fixtures/four-pages.pdf"));
    const images = workspace.getByRole("img", { name: /^four-pages\.pdf, page/ });
    await expect(images).toHaveCount(4);
    await expect.poll(() => images.evaluateAll((items) => items.every((item) =>
      item instanceof HTMLImageElement && item.complete && item.naturalWidth > 0))).toBe(true);
    if (slug === "reorder-delete") {
      await workspace.getByRole("button", { name: /^Drag page 4;/ }).dragTo(
        workspace.getByRole("listitem", { name: "Page 2, position 2 of 4", exact: true }),
      );
      await expect(workspace.getByRole("listitem", { name: "Page 4, position 2 of 4", exact: true })).toBeVisible();
      await workspace.getByRole("button", { name: "Reset page edits" }).click();
    }
    await workspace.getByRole("button", { name: "Turn page 2 right 90 degrees" }).press("Enter");
    let indices = [0, 1, 2, 3];
    if (slug === "reorder-delete") {
      const page4 = workspace.getByRole("listitem", { name: "Page 4, position 4 of 4", exact: true });
      await page4.focus();
      await page.keyboard.press("Alt+ArrowUp");
      await page.keyboard.press("Alt+ArrowUp");
      await page.keyboard.press("Alt+ArrowUp");
      await workspace.getByRole("button", { name: "Move page 2 earlier" }).press("Enter");
      await workspace.getByRole("button", { name: "Delete page 3", exact: true }).press("Enter");
      indices = [3, 1, 0];
    }
    await workspace.getByRole("button", { name: action, exact: true }).press("Enter");
    const link = workspace.getByRole("link", { name: "Download", exact: true });
    await expect(link).toBeVisible();
    const pending = page.waitForEvent("download");
    await link.click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe(`four-pages-${slug === "rotate-pdf" ? "rotated" : "reordered"}.pdf`);
    const output = new Uint8Array(await readFile((await download.path())!)).buffer;
    const pdf = await PDFDocument.load(output);
    expect(pdf.getPages().map((item) => item.getRotation().angle)).toEqual(indices.map((i) => [0, 180, 180, 270][i]));
    const source = new Uint8Array(await readFile(path.resolve("tests/fixtures/four-pages.pdf"))).buffer;
    const text = await pageTexts(source);
    expect(await pageTexts(output.slice(0))).toEqual(indices.map((i) => text[i]));
    await workspace.getByRole("button", { name: "Reset page edits" }).press("Enter");
    await expect(link).toHaveCount(0);
    await expect(images).toHaveCount(4);
    if (slug === "reorder-delete") {
      for (const number of [4, 3, 2]) {
        await workspace.getByRole("button", { name: `Delete page ${number}`, exact: true }).click();
      }
      await expect(workspace.getByRole("button", { name: "Delete page 1", exact: true })).toBeDisabled();
    }
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      await page.setViewportSize({ width: 320, height: 700 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await workspace.getByRole("button", { name: "Start again" }).press("Enter");
    await expect(picker).toBeFocused();
    await expect(images).toHaveCount(0);
    await picker.setInputFiles(path.resolve("tests/fixtures/renamed-text.pdf"));
    await expect(workspace.getByRole("alert")).toContainText("This file is not a PDF");
    await workspace.getByRole("button", { name: "Remove renamed-text.pdf" }).click();
    await picker.setInputFiles(path.resolve("tests/fixtures/invoice.pdf"));
    await workspace.getByRole("button", { name: action, exact: true }).click();
    await expect(link).toBeVisible();
    expect(sentBodies).toEqual([]);
  });
}
