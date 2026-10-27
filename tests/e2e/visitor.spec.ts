import path from "node:path";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { tools } from "../../src/lib/tools";
import { pageTexts } from "../pdf-output";

const fixture = (name: string) => path.resolve("tests/fixtures", name);

for (const viewport of [
  { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 390, height: 844 },
]) {
  for (const theme of ["light", "dark"] as const) {
    test(`home tool discovery in ${theme} at ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const main = page.getByRole("main");
      await expect(main.getByRole("heading", { level: 1 }))
        .toHaveText("Your PDFs never leave your device.");
      await expect(main.getByRole("heading", { level: 1 })).toBeInViewport({ ratio: 1 });
      const browse = main.getByRole("link", { name: "Browse 11 tools", exact: true });
      await expect(browse).toBeInViewport({ ratio: 1 });
      await browse.click();
      const toolbox = main.getByRole("region", { name: "Choose a tool", exact: true });
      await expect(toolbox.getByRole("link")).toHaveCount(tools.length);
      for (const tool of tools) {
        const link = toolbox.getByRole("link", { name: tool.name, exact: true });
        await link.scrollIntoViewIfNeeded();
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute("href", `/tools/${tool.slug}`);
        await expect(link).toContainText(tool.description);
        await expect(link).toContainText(tool.available ? "Ready" : "Coming soon");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await main.getByRole("link", { name: "How it stays private", exact: true }).click();
      await expect(main.getByRole("heading", { name: /The work happens in your browser/ })).toBeInViewport();
    });
  }
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
    await expect(page.getByText("Coming soon", { exact: true })).toHaveCount(tool.available ? 0 : 1);
    await expect(page.getByRole("region", { name: `${tool.name} workspace` })).toBeVisible();
  });
}

test("a twelve-page report renders every thumbnail and processing keeps Download disabled", async ({ page }) => {
  await page.goto("/tools/rotate-pdf");
  // Next.js also has an alert for route announcements outside the tool workspace.
  const workspace = page.getByRole("region", { name: "Rotate PDF workspace", exact: true });
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

  await expect(workspace.getByRole("alert")).toHaveText(
    "This tool is not built yet. You can preview your PDFs here; come back later to process them.",
  );
  await expect(workspace.getByRole("status")).toHaveText(
    "No result was created. Your files are still available to preview.",
  );
  await expect(download).toBeDisabled();
  await expect(page.getByRole("link", { name: "Download", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeEnabled();
});

for (const reverse of [false, true]) {
  test(`Merge PDF downloads five labeled pages in ${reverse ? "reversed" : "selected"} order`, async ({ page }) => {
    await page.setViewportSize(reverse ? { width: 390, height: 844 } : { width: 1280, height: 720 });
    await page.goto("/tools/merge-pdf");
    const unexpectedRequests: string[] = [];
    const origin = new URL(page.url()).origin;
    page.on("request", (request) => {
      if (!request.url().startsWith("http")) return;
      if (new URL(request.url()).origin !== origin || request.method() !== "GET" || request.postData()) {
        unexpectedRequests.push(request.url());
      }
    });
    const workspace = page.getByRole("region", { name: "Merge PDF workspace", exact: true });
    const picker = workspace.getByLabel("Choose PDF files", { exact: true });
    await picker.setInputFiles([fixture("merge-two.pdf"), fixture("merge-three.pdf")]);
    await expect(workspace.getByRole("button", { name: "Process PDFs", exact: true })).toBeEnabled();
    if (reverse) {
      const move = workspace.getByRole("button", { name: "Move merge-three.pdf up", exact: true });
      await move.focus();
      await page.keyboard.press("Enter");
      await expect(workspace.getByRole("status")).toContainText("moved to position 1");
    }
    await workspace.getByRole("button", { name: "Process PDFs", exact: true }).click();
    const link = workspace.getByRole("link", { name: "Download", exact: true });
    const names = reverse ? ["merge-three", "merge-two"] : ["merge-two", "merge-three"];
    await expect(link).toHaveAttribute("download", `${names[0]}-merged.pdf`);
    const pending = page.waitForEvent("download");
    await link.click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe(`${names[0]}-merged.pdf`);
    const downloaded = await download.path();
    if (!downloaded) throw new Error("Missing downloaded PDF");
    const texts = await pageTexts(new Uint8Array(await readFile(downloaded)).buffer);
    const expected = names.flatMap((name) => Array.from(
      { length: name === "merge-two" ? 2 : 3 }, (_, index) => `${name} - page ${index + 1}`,
    ));
    expect(texts).toHaveLength(5);
    texts.forEach((text, index) => expect(text).toContain(expected[index]));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(unexpectedRequests).toEqual([]);
    await workspace.getByRole("button", { name: "Start again", exact: true }).click();
    await expect(workspace.getByRole("listitem")).toHaveCount(0);
    await expect(workspace.getByRole("button", { name: "Download", exact: true })).toBeDisabled();
    await expect(picker).toBeFocused();
  });
}

test("Merge PDF can recover from a damaged file without reloading", async ({ page }) => {
  await page.goto("/tools/merge-pdf");
  const workspace = page.getByRole("region", { name: "Merge PDF workspace", exact: true });
  const picker = workspace.getByLabel("Choose PDF files", { exact: true });
  await picker.setInputFiles([fixture("report.pdf"), fixture("damaged.pdf")]);
  await expect(workspace.getByRole("alert")).toHaveText(
    "This PDF is damaged or cannot be read. Export a fresh copy and choose it again.",
  );
  await expect(workspace.getByRole("button", { name: "Process PDFs", exact: true })).toBeDisabled();
  await workspace.getByRole("button", { name: "Remove damaged.pdf", exact: true }).click();
  await picker.setInputFiles(fixture("invoice.pdf"));
  await workspace.getByRole("button", { name: "Process PDFs", exact: true }).click();
  await expect(workspace.getByRole("link", { name: "Download", exact: true }))
    .toHaveAttribute("download", "report-merged.pdf");
  await expect(workspace.getByRole("alert")).toHaveCount(0);
});

test("a text file with a PDF extension shows the not-a-PDF message", async ({ page }) => {
  await page.goto("/tools/merge-pdf");
  const workspace = page.getByRole("region", { name: "Merge PDF workspace", exact: true });
  await page.getByLabel("Choose PDF files", { exact: true }).setInputFiles(fixture("renamed-text.pdf"));

  await expect(workspace.getByRole("alert")).toHaveText("This file is not a PDF. Choose a PDF file and try again.");
  await expect(page.getByRole("img")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Process PDFs", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Download", exact: true })).toBeDisabled();
});
