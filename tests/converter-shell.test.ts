// @vitest-environment jsdom

import { createElement, useEffect } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConverterTool } from "../src/components/converter-tool";
import { PdfError } from "../src/lib/pdf-engine/errors";
import { tools } from "../src/lib/tools";

const engine = vi.hoisted(() => ({ run: vi.fn(), dispose: vi.fn() }));
vi.mock("@/lib/pdf-worker-client", () => ({ createPdfEngine: () => engine }));
vi.mock("@/components/pdf-previews", () => ({
  PdfPreviews: ({ onReady }: { onReady: (pages: number) => void }) => {
    useEffect(() => onReady(3), [onReady]);
    return null;
  },
}));
vi.mock("../src/components/image-previews", () => ({
  ImagePreviews: ({ file, onReady, onError }: {
    file: File; onReady: (pages: number) => void; onError: (message: string) => void;
  }) => {
    useEffect(() => {
      if (file.name === "bad.gif") onError("Choose a JPEG or PNG image and try again.");
      else onReady(1);
    }, [file, onReady, onError]);
    return null;
  },
}));

function file(name: string, type: string) {
  const value = new File(["fictional"], name, { type });
  Object.defineProperty(value, "arrayBuffer", { value: async () => new ArrayBuffer(8) });
  return value;
}
function workspace(slug: string) {
  const tool = tools.find((entry) => entry.slug === slug)!;
  render(createElement(ConverterTool, { tool }));
  return within(screen.getByRole("region", { name: `${tool.name} workspace` }));
}
beforeEach(() => {
  engine.run.mockReset();
  engine.dispose.mockReset();
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:output"), revokeObjectURL: vi.fn() });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("converter workspaces", () => {
  it("recovers from a bad image, submits the reordered files, and clears stale downloads", async () => {
    engine.run.mockResolvedValue({ name: "second.pdf", mimeType: "application/pdf", data: new ArrayBuffer(4) });
    const view = workspace("images-to-pdf");
    const input = view.getByLabelText("Choose image files");
    fireEvent.change(input, { target: { files: [file("bad.gif", "image/gif")] } });
    expect(view.getByRole("alert").textContent).toContain("JPEG or PNG");
    expect(view.getByRole("button", { name: "Create PDF" })).toHaveProperty("disabled", true);
    fireEvent.click(view.getByRole("button", { name: "Remove bad.gif" }));
    fireEvent.change(input, { target: { files: [file("first.png", "image/png"), file("second.jpg", "image/jpeg")] } });
    fireEvent.click(view.getByRole("button", { name: "Move second.jpg up" }));
    fireEvent.click(view.getByRole("button", { name: "Create PDF" }));
    const download = await view.findByRole("link", { name: "Download" });
    expect(download.getAttribute("download")).toBe("second.pdf");
    expect(engine.run.mock.calls[0][0].files.map((entry: { name: string }) => entry.name))
      .toEqual(["second.jpg", "first.png"]);
    fireEvent.click(view.getByRole("button", { name: "Move second.jpg down" }));
    expect(view.queryByRole("link", { name: "Download" })).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:output");
    fireEvent.click(view.getByRole("button", { name: "Start again" }));
    expect(document.activeElement).toBe(input);
    expect(engine.dispose).toHaveBeenCalledOnce();
  });

  it("corrects a page error, downloads the selected result, and resets the selection", async () => {
    engine.run.mockRejectedValueOnce(new PdfError("invalid-options", "Choose pages from 1 to 3."));
    engine.run.mockResolvedValueOnce({ name: "report-page-2.png", mimeType: "image/png", data: new ArrayBuffer(4) });
    const view = workspace("pdf-to-images");
    const input = view.getByLabelText("Choose PDF files");
    fireEvent.change(input, { target: { files: [file("report.pdf", "application/pdf")] } });
    fireEvent.change(view.getByLabelText("Pages to export"), { target: { value: "4" } });
    fireEvent.click(view.getByRole("button", { name: "Create images" }));
    expect((await view.findByRole("alert")).textContent).toContain("1 to 3");
    fireEvent.change(view.getByLabelText("Pages to export"), { target: { value: "2" } });
    fireEvent.click(view.getByRole("button", { name: "Create images" }));
    expect((await view.findByRole("link", { name: "Download" })).getAttribute("download"))
      .toBe("report-page-2.png");
    expect(engine.run.mock.calls[1][0].options).toEqual({ ranges: "2" });
    fireEvent.click(view.getByRole("button", { name: "Start again" }));
    await waitFor(() => expect(view.getByLabelText("Pages to export")).toHaveProperty("value", ""));
    expect(document.activeElement).toBe(input);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:output");
  });
});
