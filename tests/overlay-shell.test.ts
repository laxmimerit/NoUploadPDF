// @vitest-environment jsdom

import { createElement, useEffect } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PageNumbersTool } from "../src/components/page-numbers-tool";
import { WatermarkTool } from "../src/components/watermark-tool";
import { PdfError } from "../src/lib/pdf-engine/errors";
import type { PdfResult } from "../src/lib/pdf-engine/protocol";
import { tools } from "../src/lib/tools";

vi.mock("@/components/pdf-previews", () => ({
  PdfPreviews: ({ file, onReady, onError }: { file: File; onReady: (count: number) => void;
    onError: (message: string) => void }) => {
    useEffect(() => {
      if (file.name === "damaged.pdf") onError(new PdfError("damaged").message);
      else onReady(3);
    }, [file, onReady, onError]);
    return null;
  },
}));
const engine = { run: vi.fn(), dispose: vi.fn() };
const previewEngine = { run: vi.fn(() => new Promise<PdfResult>(() => {})), dispose: vi.fn() };
const factory = () => engine;
const previewFactory = () => previewEngine;
const file = (name = "report.pdf") => {
  const selected = new File(["fictional fixture"], name, { type: "application/pdf" });
  Object.defineProperty(selected, "arrayBuffer", { value: async () => new ArrayBuffer(8) });
  return selected;
};
const output = { name: "report-numbered.pdf", mimeType: "application/pdf", data: new ArrayBuffer(8) };
function setup(slug = "page-numbers") {
  const tool = tools.find((entry) => entry.slug === slug)!;
  render(slug === "page-numbers"
    ? createElement(PageNumbersTool, { tool, engineFactory: factory })
    : createElement(WatermarkTool, { tool, engineFactory: factory, previewEngineFactory: previewFactory }));
  return within(screen.getByRole("region", { name: `${tool.name} workspace` }));
}
beforeEach(() => {
  engine.run.mockReset();
  engine.dispose.mockReset();
  previewEngine.run.mockClear();
  previewEngine.dispose.mockReset();
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:result"), revokeObjectURL: vi.fn() });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("overlay shell lifecycle", () => {
  it("submits chosen numbering, retries errors with fresh bytes, and clears edits", async () => {
    engine.run.mockRejectedValueOnce(new PdfError("invalid-options", "Enter a whole starting number and try again."));
    engine.run.mockResolvedValue(output);
    const view = setup();
    fireEvent.change(view.getByLabelText("Choose PDF files"), { target: { files: [file()] } });
    fireEvent.change(view.getByLabelText("Starting number"), { target: { value: "-5" } });
    fireEvent.change(view.getByLabelText("Number position"), { target: { value: "top-right" } });
    fireEvent.click(view.getByRole("button", { name: "Save numbered PDF" }));
    expect((await view.findByRole("alert")).textContent).toContain("whole starting number");
    fireEvent.click(view.getByRole("button", { name: "Try again" }));
    expect((await view.findByRole("link", { name: "Download" })).getAttribute("download"))
      .toBe("report-numbered.pdf");
    expect(engine.run.mock.calls[1][0]).toMatchObject({
      tool: "page-numbers", options: { position: "top-right", startNumber: -5 },
    });
    expect(engine.run.mock.calls[1][0].files[0].data).not.toBe(engine.run.mock.calls[0][0].files[0].data);
    fireEvent.change(view.getByLabelText("Starting number"), { target: { value: "0" } });
    expect(view.queryByRole("link", { name: "Download" })).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:result");
    fireEvent.click(view.getByRole("button", { name: "Save numbered PDF" }));
    await view.findByRole("link", { name: "Download" });
    expect(engine.run.mock.calls[2][0].options.startNumber).toBe(0);
    fireEvent.click(view.getByRole("button", { name: "Start again" }));
    expect(view.getByLabelText("Starting number")).toHaveProperty("value", "1");
    expect(view.getByLabelText("Number position")).toHaveProperty("value", "bottom-center");
    expect(document.activeElement).toBe(view.getByLabelText("Choose PDF files"));
  });

  it("submits watermark text, pages, placement and opacity and resets all options", async () => {
    engine.run.mockResolvedValue({ ...output, name: "report-watermarked.pdf" });
    const view = setup("watermark-pdf");
    const picker = view.getByLabelText("Choose PDF files");
    expect(picker).toHaveProperty("multiple", false);
    fireEvent.change(picker, { target: { files: [file()] } });
    fireEvent.change(view.getByLabelText("Watermark text"), { target: { value: "FICTIONAL DRAFT" } });
    fireEvent.change(view.getByLabelText("Pages to watermark"), { target: { value: "1, 3" } });
    fireEvent.change(view.getByLabelText("Watermark position"), { target: { value: "diagonal" } });
    fireEvent.change(view.getByRole("slider"), { target: { value: "40" } });
    fireEvent.click(view.getByRole("button", { name: "Save watermarked PDF" }));
    expect((await view.findByRole("link", { name: "Download" })).getAttribute("download"))
      .toBe("report-watermarked.pdf");
    expect(engine.run.mock.calls[0][0]).toMatchObject({ tool: "watermark-pdf",
      options: { text: "FICTIONAL DRAFT", ranges: "1, 3", position: "diagonal", opacity: 0.4 } });
    fireEvent.change(view.getByRole("slider"), { target: { value: "25" } });
    expect(view.queryByRole("link", { name: "Download" })).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:result");
    fireEvent.click(view.getByRole("button", { name: "Start again" }));
    expect(view.getByLabelText("Watermark text")).toHaveProperty("value", "DRAFT");
    expect(view.getByLabelText("Pages to watermark")).toHaveProperty("value", "");
    expect(view.getByLabelText("Watermark position")).toHaveProperty("value", "center");
    expect(view.getByRole("slider")).toHaveProperty("value", "25");
    expect(document.activeElement).toBe(picker);
    expect(engine.dispose).toHaveBeenCalledOnce();
  });

  it.each(["page-numbers", "watermark-pdf"])("locks %s edits and discards cancelled results", async (slug) => {
    let finish!: (value: PdfResult) => void;
    engine.run.mockImplementationOnce(() => new Promise<PdfResult>((resolve) => { finish = resolve; }));
    const view = setup(slug);
    fireEvent.change(view.getByLabelText("Choose PDF files"), { target: { files: [file()] } });
    const action = slug === "page-numbers" ? "Save numbered PDF" : "Save watermarked PDF";
    fireEvent.click(view.getByRole("button", { name: action }));
    await waitFor(() => expect(engine.run).toHaveBeenCalledOnce());
    expect(view.getByRole("button", { name: "Processing PDFs…" })).toHaveProperty("disabled", true);
    const option = view.getByLabelText(slug === "page-numbers" ? "Starting number" : "Watermark text");
    expect(option.closest("fieldset")).toHaveProperty("disabled", true);
    fireEvent.click(view.getByRole("button", { name: "Start again" }));
    finish(output);
    await waitFor(() => expect(engine.dispose).toHaveBeenCalledOnce());
    expect(view.queryByRole("link", { name: "Download" })).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it.each(["page-numbers", "watermark-pdf"])("recovers from damaged input for %s without a reload", async (slug) => {
    engine.run.mockResolvedValue(output);
    const view = setup(slug);
    const picker = view.getByLabelText("Choose PDF files");
    fireEvent.change(picker, { target: { files: [file("damaged.pdf")] } });
    expect(view.getByRole("alert").textContent).toContain("damaged");
    fireEvent.click(view.getByRole("button", { name: "Remove damaged.pdf" }));
    fireEvent.change(picker, { target: { files: [file()] } });
    const action = slug === "page-numbers" ? "Save numbered PDF" : "Save watermarked PDF";
    fireEvent.click(view.getByRole("button", { name: action }));
    await view.findByRole("link", { name: "Download" });
    cleanup();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:result");
  });
});
