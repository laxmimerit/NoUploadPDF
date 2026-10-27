import path from "node:path";
import { expect, test } from "@playwright/test";
import { tools } from "../../src/lib/tools";

const fixture = (name: string) => path.resolve("tests/fixtures", name);

for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }]) {
  test(`every home-page tool fits without scrolling at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText("PDF tools. No uploads.");
    const links = main.getByRole("link");
    await expect(links).toHaveCount(tools.length);
    for (const tool of tools) {
      const link = main.getByRole("link", { name: `${tool.name} ${tool.description}`, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", `/tools/${tool.slug}`);
      await expect(link).toBeInViewport({ ratio: 1 });
    }
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
}

for (const tool of tools) {
  test(`the header menu opens ${tool.name}`, async ({ page }) => {
    await page.goto("/");
    const navigation = page.getByRole("navigation", { name: "Main navigation" });
    await navigation.getByRole("button", { name: tool.group, exact: true }).click();
    await navigation.getByRole("link", { name: tool.name, exact: true }).click();

    await expect(page).toHaveURL(`/tools/${tool.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(tool.name);
    await expect(page.getByRole("main").getByText(tool.description, { exact: true })).toBeVisible();
    await expect(page.getByText("Coming soon", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: `${tool.name} workspace` })).toBeVisible();
  });
}

test("a twelve-page report renders every thumbnail and processing keeps Download disabled", async ({ page }) => {
  await page.goto("/tools/merge-pdf");
  const download = page.getByRole("button", { name: "Download", exact: true });
  await expect(download).toBeDisabled();
  await page.getByLabel("Choose PDF files", { exact: true }).setInputFiles(fixture("report.pdf"));

  await expect(page.getByText(/· 12 pages$/)).toBeVisible();
  const thumbnails = page.getByRole("img", { name: /^report\.pdf, page \d+$/ });
  await expect(thumbnails).toHaveCount(12);
  // Check decoded images, not just twelve placeholder elements.
  await expect.poll(() => thumbnails.evaluateAll((images) => images.every((image) =>
    image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
  ))).toBe(true);
  for (let number = 1; number <= 12; number++) {
    await expect(page.getByRole("img", { name: `report.pdf, page ${number}`, exact: true })).toHaveCount(1);
  }
  await expect(download).toBeDisabled();
  await page.getByRole("button", { name: "Process PDFs", exact: true }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "This tool is not built yet. You can preview your PDFs here; come back later to process them.",
  );
  await expect(page.getByRole("status")).toHaveText(
    "No result was created. Your files are still available to preview.",
  );
  await expect(download).toBeDisabled();
  await expect(page.getByRole("link", { name: "Download", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeEnabled();
});

test("a text file with a PDF extension shows the not-a-PDF message", async ({ page }) => {
  await page.goto("/tools/merge-pdf");
  await page.getByLabel("Choose PDF files", { exact: true }).setInputFiles(fixture("renamed-text.pdf"));

  await expect(page.getByRole("alert")).toHaveText("This file is not a PDF. Choose a PDF file and try again.");
  await expect(page.getByRole("img")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Process PDFs", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Download", exact: true })).toBeDisabled();
});
