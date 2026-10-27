// @vitest-environment jsdom

import { createElement, useEffect } from "react";
import { MessageChannel } from "node:worker_threads";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CompressTool } from "../src/components/compress-tool";
import { tools } from "../src/lib/tools";
import { ToolShell } from "../src/components/tool-shell";

vi.mock("@/components/pdf-previews", () => ({
  PdfPreviews: ({ onReady }: { onReady: (count: number) => void }) => {
    useEffect(() => onReady(1), [onReady]);
    return null;
  },
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each(["scan", "cleanup"])("downloads the original bytes after %s transfers its input", async (mode) => {
  const bytes = new Uint8Array([37, 80, 68, 70, 45, 49]);
  const engine = {
    run: vi.fn(async (job: { files: { data: ArrayBuffer }[] }) => {
      const { port1, port2 } = new MessageChannel();
      const returned = new Promise<ArrayBuffer>((resolve) => port2.once("message", resolve));
      port1.postMessage(job.files[0].data, [job.files[0].data]);
      const data = await returned;
      port1.close();
      port2.close();
      return { name: "report.pdf", mimeType: "application/pdf", data };
    }),
    dispose: vi.fn(),
  };
  const createObjectURL = vi.fn((_blob: Blob) => "blob:original");
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });
  render(createElement(ToolShell, { tool: "compress-pdf", toolName: "Compress PDF",
    options: mode === "scan" ? { mode, quality: "smaller" } : { mode }, engineFactory: () => engine }));
  const workspace = within(screen.getByRole("region", { name: "Compress PDF workspace" }));
  const file = new File([bytes], "report.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.slice().buffer });
  fireEvent.change(workspace.getByLabelText("Choose PDF files"), { target: { files: [file] } });
  fireEvent.click(workspace.getByRole("button", { name: mode === "scan" ? "Compress PDF" : "Clean up PDF" }));
  const link = await workspace.findByRole("link", { name: "Download" });
  expect(link.getAttribute("download")).toBe("report.pdf");
  const blob = createObjectURL.mock.calls[0][0] as Blob;
  expect(blob.size).toBe(bytes.byteLength);
  const reader = new FileReader();
  const contents = new Promise<ArrayBuffer>((resolve) => { reader.onload = () => resolve(reader.result as ArrayBuffer); });
  reader.readAsArrayBuffer(blob);
  expect(new Uint8Array(await contents)).toEqual(bytes);
});

it.each([[5, "report-compressed.pdf", false], [10, "report.pdf", true]])(
  "shows both sizes and the correct download for a %i byte result", async (size, name, original) => {
    const engine = { run: vi.fn().mockResolvedValue({ name, mimeType: "application/pdf", data: new ArrayBuffer(size) }),
      dispose: vi.fn() };
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:result"), revokeObjectURL: vi.fn() });
    render(createElement(ToolShell, { tool: "compress-pdf", toolName: "Compress PDF", options: { mode: "cleanup" },
      engineFactory: () => engine }));
    const workspace = within(screen.getByRole("region", { name: "Compress PDF workspace" }));
    const file = new File(["1234567890"], "report.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "arrayBuffer", { value: async () => new ArrayBuffer(10) });
    fireEvent.change(workspace.getByLabelText("Choose PDF files"), { target: { files: [file] } });
    fireEvent.click(workspace.getByRole("button", { name: "Clean up PDF" }));
    expect((await workspace.findByRole("link", { name: "Download" })).getAttribute("download")).toBe(name);
    expect(workspace.getByText(`Before: 10 bytes · After: ${size} bytes`)).toBeDefined();
    if (original) expect(workspace.getByRole("status").textContent).toContain("Download your original PDF");
    expect(engine.run.mock.calls[0][0].options).toEqual({ mode: "cleanup" });
    fireEvent.click(workspace.getByRole("button", { name: "Start again" }));
    expect(workspace.queryByRole("link", { name: "Download" })).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:result");
  },
);


it("warns about scan mode, passes its quality, and resets the mode", async () => {
  const engine = { run: vi.fn().mockResolvedValue({ name: "scan.pdf", mimeType: "application/pdf",
    data: new ArrayBuffer(5) }), dispose: vi.fn() };
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:scan"), revokeObjectURL: vi.fn() });
  const tool = tools.find((entry) => entry.slug === "compress-pdf")!;
  render(createElement(CompressTool, { tool, engineFactory: () => engine }));
  const workspace = within(screen.getByRole("region", { name: "Compress PDF workspace" }));
  fireEvent.change(workspace.getByLabelText("Compression mode"), { target: { value: "scan" } });
  expect(workspace.getByText(/text will no longer be selectable or searchable/)).toBeDefined();
  fireEvent.change(workspace.getByLabelText("Scan quality"), { target: { value: "clearer" } });
  const file = new File(["1234567890"], "scan.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => new ArrayBuffer(10) });
  fireEvent.change(workspace.getByLabelText("Choose PDF files"), { target: { files: [file] } });
  fireEvent.click(workspace.getByRole("button", { name: "Compress PDF" }));
  await workspace.findByRole("link", { name: "Download" });
  expect(engine.run.mock.calls[0][0].options).toEqual({ mode: "scan", quality: "clearer" });
  fireEvent.click(workspace.getByRole("button", { name: "Start again" }));
  expect((workspace.getByLabelText("Compression mode") as HTMLSelectElement).value).toBe("cleanup");
});
