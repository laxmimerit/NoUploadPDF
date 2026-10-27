import path from "node:path";
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { pageTexts, visibleTextItems } from "../pdf-output";

function audit(page: Page) {
  const unexpected: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postDataBuffer()) unexpected.push(request.url());
  });
  return unexpected;
}

test("Page numbers saves all positions, retries invalid starts, and resets by keyboard", async ({ page }) => {
  const requests = audit(page);
  await page.goto("/tools/page-numbers");
  const view = page.getByRole("region", { name: "Page numbers workspace", exact: true });
  const picker = view.getByLabel("Choose PDF files");
  await picker.setInputFiles(path.resolve("tests/fixtures/overlay-pages.pdf"));
  const start = view.getByLabel("Starting number");
  const save = view.getByRole("button", { name: "Save numbered PDF", exact: true });
  await expect(save).toBeEnabled();
  await start.fill("1.5");
  await save.click();
  await expect(view.getByRole("alert")).toContainText("whole starting number");
  await start.fill("5");
  for (const position of ["bottom-center", "bottom-right", "top-right"]) {
    await view.getByRole("combobox", { name: "Number position" }).selectOption(position);
    await save.press("Enter");
    const download = view.getByRole("link", { name: "Download", exact: true });
    await expect(download).toBeVisible();
    const pending = page.waitForEvent("download");
    await download.click();
    const result = await pending;
    expect(result.suggestedFilename()).toBe("overlay-pages-numbered.pdf");
    const bytes = new Uint8Array(await readFile((await result.path())!)).buffer;
    const pages = await visibleTextItems(bytes);
    expect(pages).toHaveLength(3);
    pages.forEach((sheet, index) => {
      const number = sheet.items.find((item) => item.text === String(index + 5))!;
      expect(number).toBeTruthy();
      if (position === "top-right") expect(number.y).toBeLessThan(50);
      else expect(number.y).toBeGreaterThan(sheet.height - 50);
    });
  }
  await start.fill("0");
  await expect(view.getByRole("link", { name: "Download" })).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await view.getByRole("button", { name: "Start again" }).press("Enter");
  await expect(start).toHaveValue("1");
  await expect(picker).toBeFocused();
  expect(requests).toEqual([]);
});

test("Watermark PDF previews selected pages, corrects errors, downloads and resets", async ({ page }) => {
  const requests = audit(page);
  await page.goto("/tools/watermark-pdf");
  const view = page.getByRole("region", { name: "Watermark PDF workspace", exact: true });
  const picker = view.getByLabel("Choose PDF files");
  await picker.setInputFiles(path.resolve("tests/fixtures/overlay-pages.pdf"));
  const save = view.getByRole("button", { name: "Save watermarked PDF", exact: true });
  await expect(save).toBeEnabled();
  await view.getByLabel("Watermark text").fill("");
  await save.click();
  await expect(view.getByRole("alert")).toContainText("Enter watermark text");
  await view.getByLabel("Watermark text").fill("FICTIONAL DRAFT");
  await view.getByLabel("Pages to watermark").fill("1, 3");
  await view.getByRole("combobox", { name: "Watermark position" }).selectOption("diagonal");
  await expect(view.getByRole("img", { name: /overlay-pages-watermarked.pdf, page/ })).toHaveCount(3);
  await save.press("Enter");
  const download = view.getByRole("link", { name: "Download", exact: true });
  await expect(download).toBeVisible();
  const pending = page.waitForEvent("download");
  await download.click();
  const result = await pending;
  expect(result.suggestedFilename()).toBe("overlay-pages-watermarked.pdf");
  const bytes = new Uint8Array(await readFile((await result.path())!)).buffer;
  const text = await pageTexts(bytes);
  expect(text).toHaveLength(3);
  expect(text[0]).toContain("FICTIONAL DRAFT");
  expect(text[1]).not.toContain("FICTIONAL DRAFT");
  expect(text[2]).toContain("FICTIONAL DRAFT");
  text.forEach((value) => expect(value).toContain("Original fictional content stays readable."));
  await view.getByLabel("Watermark text").fill("CHANGED");
  await expect(download).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await view.getByRole("button", { name: "Start again" }).press("Enter");
  await expect(view.getByLabel("Watermark text")).toHaveValue("DRAFT");
  await expect(view.getByLabel("Pages to watermark")).toHaveValue("");
  await expect(picker).toBeFocused();
  expect(requests).toEqual([]);
});
