// @vitest-environment jsdom

import { createElement, useEffect } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ToolShell } from "../src/components/tool-shell";

vi.mock("@/components/pdf-previews", () => ({
  PdfPreviews: ({ onReady }: { onReady: (count: number) => void }) => {
    useEffect(() => onReady(1), [onReady]);
    return null;
  },
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

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
