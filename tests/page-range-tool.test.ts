// @vitest-environment jsdom

import { createElement, useEffect } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PageRangeTool } from "../src/components/page-range-tool";
import { PdfError } from "../src/lib/pdf-engine/errors";
import type { PdfResult } from "../src/lib/pdf-engine/protocol";
import { tools } from "../src/lib/tools";

const engine = vi.hoisted(() => ({ run: vi.fn(), dispose: vi.fn() }));
vi.mock("@/lib/pdf-worker-client", () => ({ createPdfEngine: () => engine }));
vi.mock("@/components/pdf-previews", () => ({
  PdfPreviews: ({ onReady }: { onReady: (pages: number) => void }) => {
    useEffect(() => onReady(12), [onReady]);
    return null;
  },
}));

const output = (name: string) => ({ name, mimeType: "application/pdf", data: new ArrayBuffer(4) });
const file = () => {
  const value = new File(["fixture bytes"], "report.pdf", { type: "application/pdf" });
  Object.defineProperty(value, "arrayBuffer", { value: async () => new ArrayBuffer(4) });
  return value;
};

function workspace() {
  const tool = tools.find((entry) => entry.slug === "split-pdf")!;
  render(createElement(PageRangeTool, { tool }));
  return within(screen.getByRole("region", { name: "Split PDF workspace" }));
}

beforeEach(() => {
  engine.run.mockReset();
  engine.dispose.mockReset();
  let index = 0;
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => `blob:result-${++index}`), revokeObjectURL: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("page-range tool lifecycle", () => {
  it("shows the worker's range error, retries, downloads every result, and clears results when options change", async () => {
    engine.run.mockRejectedValueOnce(new PdfError("invalid-options", "Part 2 (\u201c0\u201d): page numbers start at 1."));
    engine.run.mockResolvedValueOnce({ outputs: [output("part-1.pdf"), output("part-2.pdf")] });
    const view = workspace();
    fireEvent.change(view.getByLabelText("Choose PDF files"), { target: { files: [file()] } });
    fireEvent.change(view.getByLabelText("Page ranges"), { target: { value: "1-3, 0" } });
    fireEvent.click(view.getByRole("button", { name: "Process PDFs" }));
    expect(await view.findByRole("alert")).toHaveProperty("textContent", "Part 2 (\u201c0\u201d): page numbers start at 1.");
    fireEvent.change(view.getByLabelText("Page ranges"), { target: { value: "1-3, 7" } });
    fireEvent.click(view.getByRole("button", { name: "Process PDFs" }));
    const downloads = await view.findAllByRole("link");
    expect(downloads.map((link) => link.getAttribute("download"))).toEqual(["part-1.pdf", "part-2.pdf"]);
    expect(engine.run.mock.calls[1][0]).toMatchObject({ tool: "split-pdf", options: { ranges: "1-3, 7" } });
    fireEvent.change(view.getByLabelText("Page ranges"), { target: { value: "2" } });
    expect(view.queryAllByRole("link")).toHaveLength(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:result-1");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:result-2");
  });

  it("resets ranges, returns focus, and ignores a result arriving after cancellation", async () => {
    let finish!: (result: PdfResult) => void;
    engine.run.mockImplementationOnce(() => new Promise<PdfResult>((resolve) => { finish = resolve; }));
    const view = workspace();
    fireEvent.change(view.getByLabelText("Choose PDF files"), { target: { files: [file()] } });
    fireEvent.change(view.getByLabelText("Page ranges"), { target: { value: "1-3" } });
    fireEvent.click(view.getByRole("button", { name: "Process PDFs" }));
    await waitFor(() => expect(engine.run).toHaveBeenCalledOnce());
    expect(view.getByRole("button", { name: "Processing PDFs…" })).toHaveProperty("disabled", true);
    fireEvent.click(view.getByRole("button", { name: "Start again" }));
    finish({ outputs: [output("late.pdf")] });
    await waitFor(() => expect(engine.dispose).toHaveBeenCalledOnce());
    expect(view.getByLabelText("Page ranges")).toHaveProperty("value", "");
    expect(document.activeElement).toBe(view.getByLabelText("Choose PDF files"));
    expect(view.queryAllByRole("link")).toHaveLength(0);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("releases all download URLs on reset and unmount", async () => {
    engine.run.mockResolvedValue({ outputs: [output("one.pdf"), output("two.pdf")] });
    const view = workspace();
    for (const cycle of [1, 2]) {
      fireEvent.change(view.getByLabelText("Choose PDF files"), { target: { files: [file()] } });
      fireEvent.change(view.getByLabelText("Page ranges"), { target: { value: "1, 2" } });
      fireEvent.click(view.getByRole("button", { name: "Process PDFs" }));
      await view.findAllByRole("link");
      if (cycle === 1) fireEvent.click(view.getByRole("button", { name: "Start again" }));
      else cleanup();
    }
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(4);
  });

  it("refuses a batch of files and allows choosing one afterward", () => {
    const view = workspace();
    const picker = view.getByLabelText("Choose PDF files");
    expect(picker).toHaveProperty("multiple", false);
    fireEvent.drop(picker.parentElement!, { dataTransfer: { files: [file(), new File(["x"], "other.pdf")] } });
    expect(view.getByRole("alert").textContent).toContain("Choose exactly one PDF");
    expect(view.queryAllByRole("listitem")).toHaveLength(0);
    fireEvent.change(picker, { target: { files: [file()] } });
    expect(view.queryAllByRole("listitem")).toHaveLength(1);
    expect(view.queryByRole("alert")).toBeNull();
  });
});
