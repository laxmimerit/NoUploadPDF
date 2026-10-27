// @vitest-environment jsdom

import { createElement, useEffect } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CompressTool } from "../src/components/compress-tool";
import { tools } from "../src/lib/tools";
import { ToolShell } from "../src/components/tool-shell";
import { PdfError } from "../src/lib/pdf-engine/errors";
import type { PdfEngine } from "../src/lib/pdf-worker-client";

vi.mock("@/components/pdf-previews", () => ({
  PdfPreviews: ({ file, onReady, onError }: {
    file: File; onReady: (pages: number) => void; onError: (message: string) => void;
  }) => {
    useEffect(() => {
      if (file.name === "damaged.pdf") onError(new PdfError("damaged").message);
      else onReady(1);
    }, [file, onReady, onError]);
    return null;
  },
}));

function file(name: string) {
  const selected = new File(["fictional"], name, { type: "application/pdf" });
  Object.defineProperty(selected, "arrayBuffer", { value: async () => new ArrayBuffer(8) });
  return selected;
}

const output = { name: "result.pdf", mimeType: "application/pdf", data: new ArrayBuffer(8) };
function setup(engine: PdfEngine) {
  render(createElement(ToolShell, { tool: "merge-number-compress", toolName: "Merge, number and compress",
    options: { mode: "cleanup" }, engineFactory: () => engine }));
  return within(screen.getByRole("region", { name: "Merge, number and compress workspace" }));
}

beforeEach(() => vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:chain"), revokeObjectURL: vi.fn() }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("chain workspace", () => {
  it("selects files together, sends their chosen order, and clears a stale download", async () => {
    const engine = { run: vi.fn<PdfEngine["run"]>().mockResolvedValue(output), dispose: vi.fn() };
    const workspace = setup(engine);
    fireEvent.change(workspace.getByLabelText("Choose PDF files"), {
      target: { files: [file("one.pdf"), file("two.pdf")] },
    });
    fireEvent.click(workspace.getByRole("button", { name: "Move two.pdf up" }));
    fireEvent.click(workspace.getByRole("button", { name: /Process PDFs|Create PDF/i }));
    const link = await workspace.findByRole("link", { name: "Download" });
    expect(link.getAttribute("download")).toBe("result.pdf");
    expect(engine.run.mock.calls[0][0]).toMatchObject({ tool: "merge-number-compress", options: { mode: "cleanup" } });
    expect(engine.run.mock.calls[0][0].files.map((input) => input.name)).toEqual(["two.pdf", "one.pdf"]);
    fireEvent.click(workspace.getByRole("button", { name: "Move two.pdf down" }));
    expect(workspace.queryByRole("link", { name: "Download" })).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:chain");
  });

  it("names Merge PDF for a damaged preview and offers no download", () => {
    const engine = { run: vi.fn<PdfEngine["run"]>().mockResolvedValue(output), dispose: vi.fn() };
    const workspace = setup(engine);
    fireEvent.change(workspace.getByLabelText("Choose PDF files"), {
      target: { files: [file("one.pdf"), file("damaged.pdf"), file("two.pdf")] },
    });
    expect(workspace.getByRole("alert").textContent).toContain(`Merge PDF: ${new PdfError("damaged").message}`);
    expect(workspace.queryByRole("link", { name: "Download" })).toBeNull();
    expect(engine.run).not.toHaveBeenCalled();
  });

  it("shows a failed step, retries with fresh buffers, and discards a cancelled result", async () => {
    let finish: (value: typeof output) => void = () => {};
    const engine = {
      run: vi.fn<PdfEngine["run"]>()
        .mockRejectedValueOnce(new PdfError("invalid-options", "Page numbers: Choose a larger-page PDF."))
        .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })),
      dispose: vi.fn(),
    };
    const workspace = setup(engine);
    fireEvent.change(workspace.getByLabelText("Choose PDF files"), {
      target: { files: [file("one.pdf"), file("two.pdf")] },
    });
    fireEvent.click(workspace.getByRole("button", { name: /Process PDFs|Create PDF/i }));
    expect((await workspace.findByRole("alert")).textContent).toContain("Page numbers:");
    expect(workspace.queryByRole("link", { name: "Download" })).toBeNull();
    fireEvent.click(workspace.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(engine.run).toHaveBeenCalledTimes(2));
    expect(engine.run.mock.calls[1][0].files[0].data).not.toBe(engine.run.mock.calls[0][0].files[0].data);
    fireEvent.click(workspace.getByRole("button", { name: "Start again" }));
    finish(output);
    await waitFor(() => expect(workspace.getByRole("status").textContent).toContain("Files cleared"));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});

it("offers scan quality and explains the numbered fallback, then resets the selection", async () => {
  const result = { ...output, compressionInputSize: 8 };
  const engine = { run: vi.fn<PdfEngine["run"]>().mockResolvedValue(result), dispose: vi.fn() };
  const tool = tools.find((entry) => entry.slug === "merge-number-compress")!;
  render(createElement(CompressTool, { tool, engineFactory: () => engine }));
  const workspace = within(screen.getByRole("region", { name: `${tool.name} workspace` }));
  fireEvent.change(workspace.getByLabelText("Compression mode"), { target: { value: "scan" } });
  expect(workspace.getByText(/text will no longer be selectable or searchable/)).toBeDefined();
  expect(workspace.getByText(/merged and numbered PDF.*is offered/)).toBeDefined();
  fireEvent.change(workspace.getByLabelText("Scan quality"), { target: { value: "clearer" } });
  fireEvent.change(workspace.getByLabelText("Choose PDF files"), {
    target: { files: [file("one.pdf"), file("two.pdf")] },
  });
  fireEvent.click(workspace.getByRole("button", { name: "Process PDFs" }));
  await workspace.findByRole("link", { name: "Download" });
  expect(engine.run.mock.calls[0][0].options).toEqual({ mode: "scan", quality: "clearer" });
  expect(workspace.getByText("Before compression: 8 bytes · After: 8 bytes")).toBeDefined();
  expect(workspace.getByRole("status").textContent).toContain("Download your merged and numbered PDF");
  fireEvent.click(workspace.getByRole("button", { name: "Start again" }));
  expect((workspace.getByLabelText("Compression mode") as HTMLSelectElement).value).toBe("cleanup");
  expect(workspace.queryByRole("link", { name: "Download" })).toBeNull();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:chain");
});
