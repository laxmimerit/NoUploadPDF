// @vitest-environment jsdom

import { createElement, useEffect, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PageGridTool } from "../src/components/page-grid-tool";
import { PdfError } from "../src/lib/pdf-engine/errors";
import type { PdfResult } from "../src/lib/pdf-engine/protocol";
import { tools } from "../src/lib/tools";

const engine = vi.hoisted(() => ({ run: vi.fn(), dispose: vi.fn() }));
vi.mock("@/lib/pdf-worker-client", () => ({ createPdfEngine: () => engine }));
vi.mock("@/components/pdf-previews", () => ({
  PdfPreviews: ({ file, onReady, onError, children }: { file: File; onReady: (count: number) => void;
    onError: (message: string) => void; children: (images: { page: number; url: string }[]) => ReactNode }) => {
    useEffect(() => {
      if (file.name === "damaged.pdf") onError(new PdfError("damaged").message);
      else onReady(4);
    }, [file, onReady, onError]);
    return children([1, 2, 3, 4].map((page) => ({ page, url: `blob:preview-${page}` })));
  },
}));
const file = (name = "report.pdf") => {
  const selected = new File(["fictional"], name, { type: "application/pdf" });
  Object.defineProperty(selected, "arrayBuffer", { value: async () => new ArrayBuffer(8) });
  return selected;
};
const output = { name: "report-rotated.pdf", mimeType: "application/pdf", data: new ArrayBuffer(8) };
function setup(slug = "rotate-pdf") {
  const tool = tools.find((entry) => entry.slug === slug)!;
  render(createElement(PageGridTool, { tool }));
  return within(screen.getByRole("region", { name: `${tool.name} workspace` }));
}
beforeEach(() => {
  engine.run.mockReset();
  engine.dispose.mockReset();
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:result"), revokeObjectURL: vi.fn() });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("page grid shell lifecycle", () => {
  it("submits additive page turns, retries a useful error, and releases results after button edits", async () => {
    engine.run.mockRejectedValueOnce(new PdfError("invalid-options", "Reset page edits and try again."));
    engine.run.mockResolvedValue(output);
    const view = setup();
    fireEvent.change(view.getByLabelText("Choose PDF files"), { target: { files: [file()] } });
    fireEvent.click(view.getByRole("button", { name: "Turn page 2 right 90 degrees" }));
    fireEvent.click(view.getByRole("button", { name: "Save rotated PDF" }));
    expect((await view.findByRole("alert")).textContent).toContain("Reset page edits");
    fireEvent.click(view.getByRole("button", { name: "Try again" }));
    const download = await view.findByRole("link", { name: "Download" });
    expect(download.getAttribute("download")).toBe("report-rotated.pdf");
    expect(engine.run.mock.calls[1][0].options).toEqual({ order: [1, 2, 3, 4], rotations: [0, 90, 0, 0] });
    expect(engine.run.mock.calls[1][0].files[0].data).not.toBe(engine.run.mock.calls[0][0].files[0].data);
    fireEvent.click(view.getByRole("button", { name: "Turn page 2 right 90 degrees" }));
    expect(view.queryByRole("link", { name: "Download" })).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:result");
    fireEvent.click(view.getByRole("button", { name: "Save rotated PDF" }));
    await view.findByRole("link", { name: "Download" });
    fireEvent.click(view.getByRole("button", { name: "Reset page edits" }));
    expect(view.queryByRole("link", { name: "Download" })).toBeNull();
  });

  it("recovers from a broken file, saves changed order, and resets selection and focus", async () => {
    engine.run.mockResolvedValue({ ...output, name: "report-reordered.pdf" });
    const view = setup("reorder-delete");
    const picker = view.getByLabelText("Choose PDF files");
    fireEvent.change(picker, { target: { files: [file("damaged.pdf")] } });
    expect(view.getByRole("alert").textContent).toContain("damaged");
    expect(view.getByRole("button", { name: "Save PDF" })).toHaveProperty("disabled", true);
    fireEvent.click(view.getByRole("button", { name: "Remove damaged.pdf" }));
    fireEvent.change(picker, { target: { files: [file()] } });
    fireEvent.click(view.getByRole("button", { name: "Move page 4 earlier" }));
    fireEvent.click(view.getByRole("button", { name: "Delete page 3" }));
    fireEvent.click(view.getByRole("button", { name: "Save PDF" }));
    await view.findByRole("link", { name: "Download" });
    expect(engine.run.mock.calls[0][0].options.order).toEqual([1, 2, 4]);
    fireEvent.click(view.getByRole("button", { name: "Start again" }));
    expect(view.queryByRole("listitem")).toBeNull();
    expect(view.queryByRole("link", { name: "Download" })).toBeNull();
    expect(document.activeElement).toBe(picker);
    expect(engine.dispose).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:result");
  });

  it("disables edits while processing and ignores a late result after reset", async () => {
    let finish!: (value: PdfResult) => void;
    engine.run.mockImplementationOnce(() => new Promise<PdfResult>((resolve) => { finish = resolve; }));
    const view = setup();
    fireEvent.change(view.getByLabelText("Choose PDF files"), { target: { files: [file()] } });
    fireEvent.click(view.getByRole("button", { name: "Save rotated PDF" }));
    await waitFor(() => expect(engine.run).toHaveBeenCalledOnce());
    expect(view.getByRole("button", { name: "Turn page 2 right 90 degrees" })).toHaveProperty("disabled", true);
    fireEvent.click(view.getByRole("button", { name: "Start again" }));
    finish(output);
    await waitFor(() => expect(engine.dispose).toHaveBeenCalledOnce());
    expect(view.queryByRole("link", { name: "Download" })).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
