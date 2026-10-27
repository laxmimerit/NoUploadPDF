// @vitest-environment jsdom

import { createElement, useEffect } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WatermarkPreview } from "../src/components/watermark-preview";
import { PdfError } from "../src/lib/pdf-engine/errors";
import type { PdfResult } from "../src/lib/pdf-engine/protocol";

vi.mock("@/components/pdf-previews", () => ({
  PdfPreviews: ({ file, onReady, renderPages = true }: {
    file: File; onReady: (count: number) => void; renderPages?: boolean;
  }) => {
    useEffect(() => onReady(3), [onReady]);
    return renderPages ? createElement("p", null, `Rendered ${file.name}`) : null;
  },
}));
const output = { name: "report-watermarked.pdf", mimeType: "application/pdf", data: new ArrayBuffer(8) };
const options = { text: "DRAFT", ranges: "1, 3", position: "center", opacity: 0.25 };
const engine = { run: vi.fn(), dispose: vi.fn() };
const factory = () => engine;
const onReady = vi.fn();
const onError = vi.fn();
function props() {
  const file = new File(["fictional"], "report.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => new ArrayBuffer(8) });
  return { file, options, onReady, onError, disabled: false, engineFactory: factory };
}
async function generate() {
  await act(async () => { await vi.advanceTimersByTimeAsync(400); });
}
beforeEach(() => {
  vi.useFakeTimers();
  engine.run.mockReset();
  engine.dispose.mockReset();
  onReady.mockReset();
  onError.mockReset();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("local watermark placement preview", () => {
  it("keeps a completed preview when saving temporarily disables processing", async () => {
    engine.run.mockResolvedValue(output);
    const original = props();
    const view = render(createElement(WatermarkPreview, original));
    await generate();
    expect(screen.getByText("Rendered report-watermarked.pdf")).toBeDefined();
    view.rerender(createElement(WatermarkPreview, { ...original, disabled: true }));
    view.rerender(createElement(WatermarkPreview, { ...original, disabled: false }));
    await generate();
    expect(engine.run).toHaveBeenCalledOnce();
    expect(screen.getAllByText("Rendered report-watermarked.pdf")).toHaveLength(1);
  });

  it("previews the worker output using the exact download options and fresh source bytes", async () => {
    engine.run.mockResolvedValue(output);
    const original = props();
    const view = render(createElement(WatermarkPreview, original));
    expect(onReady).toHaveBeenCalledWith(3);
    expect(engine.run).not.toHaveBeenCalled();
    await generate();
    expect(screen.getByText("Rendered report-watermarked.pdf")).toBeDefined();
    expect(engine.run.mock.calls[0][0]).toMatchObject({ tool: "watermark-pdf", options });
    view.rerender(createElement(WatermarkPreview, { ...original, options: { ...options, position: "diagonal" } }));
    expect(screen.queryByText("Rendered report-watermarked.pdf")).toBeNull();
    await generate();
    expect(engine.run.mock.calls[1][0].options.position).toBe("diagonal");
    expect(engine.run.mock.calls[1][0].files[0].data).not.toBe(engine.run.mock.calls[0][0].files[0].data);
    expect(engine.dispose).toHaveBeenCalled();
  });

  it("shows a useful option error and can regenerate after correction", async () => {
    engine.run.mockRejectedValueOnce(new PdfError("invalid-options", "Enter watermark text and try again."));
    engine.run.mockResolvedValueOnce(output);
    const original = props();
    const view = render(createElement(WatermarkPreview, original));
    await generate();
    expect(screen.getByRole("status").textContent).toContain("Enter watermark text and try again.");
    expect(screen.queryByText("Rendered report-watermarked.pdf")).toBeNull();
    view.rerender(createElement(WatermarkPreview, { ...original, options: { ...options, text: "RETRY COPY" } }));
    await generate();
    expect(screen.getByText("Rendered report-watermarked.pdf")).toBeDefined();
  });

  it("cancels stale preview jobs when disabled, replaced or unmounted", async () => {
    let finish!: (value: PdfResult) => void;
    engine.run.mockImplementationOnce(() => new Promise<PdfResult>((resolve) => { finish = resolve; }));
    const original = props();
    const view = render(createElement(WatermarkPreview, original));
    await generate();
    view.rerender(createElement(WatermarkPreview, { ...original, disabled: true }));
    expect(engine.dispose).toHaveBeenCalled();
    await act(async () => { finish(output); });
    expect(screen.queryByText("Rendered report-watermarked.pdf")).toBeNull();
    view.rerender(createElement(WatermarkPreview, { ...original, options: { ...options, text: "LATEST" } }));
    view.unmount();
    await generate();
    expect(engine.run).toHaveBeenCalledOnce();
  });
});
