// @vitest-environment jsdom

import { createElement, useEffect } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToolShell } from "../src/components/tool-shell";
import { PdfError } from "../src/lib/pdf-engine/errors";
import type { PdfResult } from "../src/lib/pdf-engine/protocol";
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
  const selected = new File(["fixture"], name, { type: "application/pdf" });
  Object.defineProperty(selected, "arrayBuffer", { value: async () => new ArrayBuffer(8) });
  return selected;
}

const result: PdfResult = { name: "report-merged.pdf", mimeType: "application/pdf", data: new ArrayBuffer(8) };

function setup(engine: PdfEngine) {
  render(createElement(ToolShell, { tool: "merge-pdf", toolName: "Merge PDF", engineFactory: () => engine }));
  return within(screen.getByRole("region", { name: "Merge PDF workspace" }));
}

beforeEach(() => vi.stubGlobal("URL", {
  createObjectURL: vi.fn(() => "blob:merged-test"), revokeObjectURL: vi.fn(),
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Merge PDF workspace", () => {
  it("submits the chosen order and clears a stale download when the order changes", async () => {
    const engine = { run: vi.fn<PdfEngine["run"]>().mockResolvedValue(result), dispose: vi.fn() };
    const workspace = setup(engine);
    const picker = workspace.getByLabelText("Choose PDF files");
    fireEvent.change(picker, { target: { files: [file("report.pdf")] } });
    expect((workspace.getByRole("button", { name: "Process PDFs" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(picker, { target: { files: [file("invoice.pdf")] } });
    fireEvent.click(workspace.getByRole("button", { name: "Move invoice.pdf up" }));
    fireEvent.click(workspace.getByRole("button", { name: "Process PDFs" }));
    const download = await workspace.findByRole("link", { name: "Download" });
    expect(engine.run.mock.calls[0][0].files.map((input) => input.name)).toEqual(["invoice.pdf", "report.pdf"]);
    expect(download.getAttribute("download")).toBe("report-merged.pdf");
    fireEvent.click(workspace.getByRole("button", { name: "Move invoice.pdf down" }));
    expect(workspace.queryByRole("link", { name: "Download" })).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:merged-test");
    expect(workspace.getByRole("status").textContent).toContain("moved to position 2");
  });

  it("shows damaged-file recovery, accepts a replacement, and resets after success", async () => {
    const engine = { run: vi.fn<PdfEngine["run"]>().mockResolvedValue(result), dispose: vi.fn() };
    const workspace = setup(engine);
    const picker = workspace.getByLabelText("Choose PDF files");
    fireEvent.change(picker, { target: { files: [file("report.pdf"), file("damaged.pdf")] } });
    expect(workspace.getByRole("alert").textContent).toBe(new PdfError("damaged").message);
    expect((workspace.getByRole("button", { name: "Process PDFs" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(workspace.getByRole("button", { name: "Remove damaged.pdf" }));
    fireEvent.change(picker, { target: { files: [file("invoice.pdf")] } });
    fireEvent.click(workspace.getByRole("button", { name: "Process PDFs" }));
    await workspace.findByRole("link", { name: "Download" });
    fireEvent.click(workspace.getByRole("button", { name: "Start again" }));
    expect(engine.dispose).toHaveBeenCalledOnce();
    expect(workspace.queryByRole("listitem")).toBeNull();
    expect(workspace.queryByRole("link", { name: "Download" })).toBeNull();
    expect(document.activeElement).toBe(picker);
  });

  it("shows worker errors, retries with fresh buffers, and ignores results after cancellation", async () => {
    let finish: (value: PdfResult) => void = () => {};
    const engine = {
      run: vi.fn<PdfEngine["run"]>().mockRejectedValueOnce(new PdfError("damaged"))
        .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })),
      dispose: vi.fn(),
    };
    const workspace = setup(engine);
    fireEvent.change(workspace.getByLabelText("Choose PDF files"), {
      target: { files: [file("report.pdf"), file("invoice.pdf")] },
    });
    fireEvent.click(workspace.getByRole("button", { name: "Process PDFs" }));
    expect((await workspace.findByRole("alert")).textContent).toBe(new PdfError("damaged").message);
    fireEvent.click(workspace.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(engine.run).toHaveBeenCalledTimes(2));
    expect(engine.run.mock.calls[1][0].files[0].data).not.toBe(engine.run.mock.calls[0][0].files[0].data);
    expect((workspace.getByRole("button", { name: "Move report.pdf down" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(workspace.getByRole("button", { name: "Start again" }));
    finish(result);
    await waitFor(() => expect(workspace.getByRole("status").textContent).toContain("Files cleared"));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
