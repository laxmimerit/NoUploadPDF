// @vitest-environment jsdom

import { createElement } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdfPreviews } from "../src/components/pdf-previews";

const pdfjs = vi.hoisted(() => ({ getDocument: vi.fn(), GlobalWorkerOptions: { workerSrc: "" } }));
vi.mock("pdfjs-dist", () => pdfjs);
const ready = vi.fn();
const error = vi.fn();
function source() {
  const file = new File(["%PDF-1.7 fictional fixture"], "report-watermarked.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => new TextEncoder().encode("%PDF-1.7 fictional fixture").buffer,
  });
  return file;
}
function documentWithPages(count: number) {
  return { promise: Promise.resolve({ numPages: count, getPermissions: async () => null,
    getPage: async () => ({ getViewport: () => ({ width: 120, height: 180 }),
      render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }), cleanup: vi.fn() }) }),
  destroy: vi.fn(async () => {}) };
}
beforeEach(() => {
  pdfjs.getDocument.mockReset();
  ready.mockReset();
  error.mockReset();
  let index = 0;
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => `blob:preview-${++index}`), revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob(["image"])));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("PDF preview replacement", () => {
  it("replaces thumbnails when a new File with the same name arrives", async () => {
    pdfjs.getDocument.mockReturnValueOnce(documentWithPages(3)).mockReturnValueOnce(documentWithPages(1));
    const view = render(createElement(PdfPreviews, { file: source(), onReady: ready, onError: error }));
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(3));
    expect(screen.getAllByRole("img").map((image) => image.getAttribute("src")))
      .toEqual(["blob:preview-1", "blob:preview-2", "blob:preview-3"]);
    view.rerender(createElement(PdfPreviews, { file: source(), onReady: ready, onError: error }));
    await waitFor(() => expect(ready).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));
    expect(screen.getByRole("img").getAttribute("src")).toBe("blob:preview-4");
    for (const url of ["blob:preview-1", "blob:preview-2", "blob:preview-3"]) {
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
    }
    expect(error).not.toHaveBeenCalled();
  });

  it("does not append duplicate thumbnails when rendering restarts for unchanged bytes", async () => {
    pdfjs.getDocument.mockImplementation(() => documentWithPages(3));
    const file = source();
    const view = render(createElement(PdfPreviews, { file, onReady: ready, onError: error }));
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(3));
    view.rerender(createElement(PdfPreviews, { file, onReady: ready, onError: error, renderPages: false }));
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    await waitFor(() => expect(ready).toHaveBeenCalledTimes(2));
    view.rerender(createElement(PdfPreviews, { file, onReady: ready, onError: error, renderPages: true }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(6));
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });
});
