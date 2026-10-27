// @vitest-environment jsdom

import { createElement, useEffect, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignPdfTool } from "../src/components/sign-pdf-tool";
import { PdfError } from "../src/lib/pdf-engine/errors";
import type { PdfResult } from "../src/lib/pdf-engine/protocol";
import { tools } from "../src/lib/tools";

vi.mock("@/components/pdf-previews", () => ({
  PdfPreviews: ({ file, onReady, onError, children }: { file: File; onReady: (count: number) => void;
    onError: (message: string) => void; children: (pages: { page: number; url: string }[]) => ReactNode }) => {
    useEffect(() => {
      if (file.name === "damaged.pdf") onError(new PdfError("damaged").message);
      else onReady(3);
    }, [file, onReady, onError]);
    return children([1, 2, 3].map((page) => ({ page, url: `blob:page-${page}` })));
  },
}));
const png = "data:image/png;base64,ZmFrZQ==";
const context = { clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), moveTo: vi.fn(),
  lineTo: vi.fn(), stroke: vi.fn(), drawImage: vi.fn(), fillText: vi.fn(), measureText: vi.fn() };
const fontLoad = vi.fn();
const engine = { run: vi.fn(), dispose: vi.fn() };
const factory = () => engine;
const output = { name: "report-signed.pdf", mimeType: "application/pdf", data: new ArrayBuffer(8) };
let decode: () => Promise<void>;
function pdf(name = "report.pdf") {
  const file = new File(["fictional"], name, { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => new ArrayBuffer(8) });
  return file;
}
function setup() {
  render(createElement(SignPdfTool, { tool: tools.find((entry) => entry.slug === "sign-pdf")!, engineFactory: factory }));
  return within(screen.getByRole("region", { name: "Sign PDF workspace" }));
}
function loadPage(width = 600, height = 800) {
  const image = screen.getByAltText(/report.pdf, page/);
  Object.defineProperties(image, { naturalWidth: { value: width, configurable: true },
    naturalHeight: { value: height, configurable: true } });
  fireEvent.load(image);
}
function draw() {
  const canvas = screen.getByLabelText("Draw your signature");
  fireEvent.pointerDown(canvas, { pointerId: 1, button: 0, clientX: 50, clientY: 20 });
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 100, clientY: 50 });
  fireEvent.pointerUp(canvas, { pointerId: 1 });
}
beforeEach(() => {
  engine.run.mockReset();
  engine.dispose.mockReset();
  engine.run.mockResolvedValue(output);
  fontLoad.mockReset().mockResolvedValue([{}]);
  context.fillText.mockClear();
  context.measureText.mockReset().mockReturnValue({ width: 240, actualBoundingBoxLeft: 4,
    actualBoundingBoxRight: 245, actualBoundingBoxAscent: 60, actualBoundingBoxDescent: 24 });
  Object.defineProperty(document, "fonts", { configurable: true, value: { load: fontLoad } });
  decode = async () => {};
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:local"), revokeObjectURL: vi.fn() });
  vi.stubGlobal("PointerEvent", class extends MouseEvent {
    pointerId: number; isPrimary = true;
    constructor(type: string, init: PointerEventInit) { super(type, init); this.pointerId = init.pointerId ?? 1; }
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(png);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 600,
    height: 800, bottom: 800, right: 600, x: 0, y: 0, toJSON: () => ({}) });
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  vi.stubGlobal("Image", class {
    src = ""; naturalWidth = 300; naturalHeight = 100;
    decode() { return decode(); }
  });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(document, "fonts");
});

describe("Sign PDF visitor controls", () => {
  it("renders typed text with the loaded handwriting font and exports through the existing placement", async () => {
    const view = setup();
    expect(view.getByText(/visible signature, not a digital signature/)).toBeDefined();
    fireEvent.change(view.getByLabelText("Choose PDF files"), { target: { files: [pdf()] } });
    loadPage();
    const name = view.getByRole("textbox", { name: "Type your signature" });
    expect(name).toHaveProperty("maxLength", 80);
    expect(view.getByRole("button", { name: "Use typed signature" })).toHaveProperty("disabled", true);
    fireEvent.change(name, { target: { value: "  Asha Rao  " } });
    fireEvent.click(view.getByRole("button", { name: "Use typed signature" }));
    await view.findByText("Signature ready.");
    expect(fontLoad).toHaveBeenCalledWith('64px "NoUploadPDF Signature"', "Asha Rao");
    expect(context.fillText).toHaveBeenCalledWith("Asha Rao", 16, 76);
    expect(view.getByAltText("Your signature").getAttribute("src")).toBe(png);
    await waitFor(() => expect(view.getByRole("button", { name: "Save signed PDF" })).toHaveProperty("disabled", false));
    fireEvent.click(view.getByRole("button", { name: "Save signed PDF" }));
    await view.findByRole("link", { name: "Download" });
    expect(engine.run.mock.calls[0][0].options).toMatchObject({ signature: png, page: 1 });
    vi.mocked(HTMLCanvasElement.prototype.toDataURL).mockReturnValue("data:image/png;base64,bmV3");
    fireEvent.change(name, { target: { value: "Ravi Shah" } });
    fireEvent.click(view.getByRole("button", { name: "Use typed signature" }));
    await waitFor(() => expect(context.fillText).toHaveBeenCalledWith("Ravi Shah", 16, 76));
    expect(view.queryByRole("link", { name: "Download" })).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Start again" }));
    expect(view.getByRole("textbox", { name: "Type your signature" })).toHaveProperty("value", "");
  });

  it("waits for the font and allows retry when the local font is missing or fails to load", async () => {
    const view = setup();
    const button = view.getByRole("button", { name: "Use typed signature" });
    fireEvent.change(view.getByRole("textbox", { name: "Type your signature" }), { target: { value: "Asha" } });
    fontLoad.mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(button);
    expect((await view.findByRole("alert")).textContent).toContain("handwriting font could not load");
    expect(context.fillText).not.toHaveBeenCalled();
    fontLoad.mockResolvedValueOnce([]);
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveProperty("disabled", false));
    expect(context.fillText).not.toHaveBeenCalled();
    fireEvent.click(button);
    await view.findByText("Signature ready.");
    expect(view.queryByRole("alert")).toBeNull();
  });

  it.each(["clear", "reset", "draw", "upload", "edit"])(
    "discards pending typed text after %s while the handwriting font is loading", async (action) => {
      let finish!: (faces: object[]) => void;
      fontLoad.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
      const view = setup();
      const name = view.getByRole("textbox", { name: "Type your signature" });
      fireEvent.change(name, { target: { value: "Asha" } });
      fireEvent.click(view.getByRole("button", { name: "Use typed signature" }));
      expect(context.fillText).not.toHaveBeenCalled();
      if (action === "clear") fireEvent.click(view.getByRole("button", { name: "Clear signature" }));
      if (action === "reset") fireEvent.click(view.getByRole("button", { name: "Start again" }));
      if (action === "draw") draw();
      if (action === "upload") {
        fireEvent.change(view.getByLabelText("Upload signature (PNG or JPEG)"), {
          target: { files: [new File(["fictional"], "mark.png")] },
        });
      }
      if (action === "edit") fireEvent.change(name, { target: { value: "Ravi" } });
      await act(async () => { finish([{}]); });
      expect(context.fillText).not.toHaveBeenCalled();
    },
  );

  it("draws, drags and resizes, then sends exactly the displayed rectangle to export", async () => {
    const view = setup();
    fireEvent.change(view.getByLabelText("Choose PDF files"), { target: { files: [pdf()] } });
    loadPage();
    draw();
    const signature = view.getByRole("button", { name: "Move signature" });
    fireEvent.pointerDown(signature, { pointerId: 4, button: 0, clientX: 60, clientY: 560 });
    fireEvent.pointerMove(signature, { pointerId: 4, clientX: 120, clientY: 480 });
    fireEvent.pointerUp(signature, { pointerId: 4 });
    expect(signature).toHaveProperty("style.left", "20%");
    expect(signature).toHaveProperty("style.top", "60%");
    const handle = view.getByRole("button", { name: "Resize signature" });
    fireEvent.pointerDown(handle, { pointerId: 5, button: 0, clientX: 300, clientY: 540 });
    fireEvent.pointerMove(handle, { pointerId: 5, clientX: 360, clientY: 540 });
    fireEvent.pointerUp(handle, { pointerId: 5 });
    expect(signature).toHaveProperty("style.width", "40%");
    expect(parseFloat(signature.style.height)).toBeCloseTo(10);
    fireEvent.click(view.getByRole("button", { name: "Save signed PDF" }));
    await view.findByRole("link", { name: "Download" });
    expect(engine.run.mock.calls[0][0]).toMatchObject({ tool: "sign-pdf",
      options: { signature: png, page: 1, x: 0.2, y: 0.6 } });
    expect(engine.run.mock.calls[0][0].options.width).toBeCloseTo(0.4);
    expect(engine.run.mock.calls[0][0].options.height).toBeCloseTo(0.1);
    expect(view.getByRole("link", { name: "Download" })).toHaveProperty("download", "report-signed.pdf");
    fireEvent.keyDown(signature, { key: "ArrowRight" });
    expect(view.queryByRole("link", { name: "Download" })).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local");
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(Number((view.getByLabelText("Width (% of page)") as HTMLInputElement).value)).toBe(39.5);
  });

  it("supports keyboard page, position and size controls, clamps to the page, and clears everything on reset", async () => {
    const view = setup();
    const picker = view.getByLabelText("Choose PDF files");
    expect(picker).toHaveProperty("multiple", false);
    fireEvent.change(picker, { target: { files: [pdf()] } });
    draw();
    fireEvent.change(view.getByLabelText("Page to sign"), { target: { value: "3" } });
    loadPage();
    fireEvent.change(view.getByLabelText("Width (% of page)"), { target: { value: "45" } });
    fireEvent.change(view.getByLabelText("Left (% of page)"), { target: { value: "95" } });
    fireEvent.change(view.getByLabelText("Top (% of page)"), { target: { value: "99" } });
    const signature = view.getByRole("button", { name: "Move signature" });
    expect(parseFloat(signature.style.left)).toBeCloseTo(55);
    expect(signature.style.top).toBe("88.75%");
    fireEvent.click(view.getByRole("button", { name: "Save signed PDF" }));
    await view.findByRole("link", { name: "Download" });
    expect(engine.run.mock.calls[0][0].options).toMatchObject({ page: 3, width: 0.45, height: 0.1125 });
    fireEvent.click(view.getByRole("button", { name: "Start again" }));
    expect(view.queryByRole("button", { name: "Move signature" })).toBeNull();
    expect(view.getByText("Add a signature.")).toBeDefined();
    expect(document.activeElement).toBe(picker);
    expect(engine.dispose).toHaveBeenCalledOnce();
  });

  it("rejects missing signatures with a retry, using fresh PDF bytes after correction", async () => {
    const view = setup();
    engine.run.mockRejectedValueOnce(new PdfError("invalid-options", "Draw a signature and try again."));
    fireEvent.change(view.getByLabelText("Choose PDF files"), { target: { files: [pdf()] } });
    loadPage();
    fireEvent.click(view.getByRole("button", { name: "Save signed PDF" }));
    expect((await view.findByRole("alert")).textContent).toContain("Draw a signature");
    draw();
    fireEvent.click(view.getByRole("button", { name: "Save signed PDF" }));
    await view.findByRole("link", { name: "Download" });
    expect(engine.run.mock.calls[0][0].files[0].data).not.toBe(engine.run.mock.calls[1][0].files[0].data);
  });

  it("normalizes an uploaded signature locally, revokes its URL, and allows upload correction", async () => {
    const view = setup();
    const picker = view.getByLabelText("Upload signature (PNG or JPEG)");
    fireEvent.change(picker, { target: { files: [new File(["fictional"], "mark.svg")] } });
    expect(view.getByRole("alert").textContent).toContain("PNG or JPEG");
    fireEvent.change(picker, { target: { files: [new File(["fictional"], "mark.jpg")] } });
    await view.findByText("Signature ready.");
    expect(context.drawImage).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local");
    fireEvent.change(view.getByLabelText("Choose PDF files"), { target: { files: [pdf()] } });
    loadPage();
    expect(view.getByAltText("Your signature").getAttribute("src")).toBe(png);
    fireEvent.click(view.getByRole("button", { name: "Clear signature" }));
    expect(view.queryByAltText("Your signature")).toBeNull();
  });

  it("ignores stale image decoding after clearing, resetting, or replacing an upload", async () => {
    let finish!: () => void;
    decode = () => new Promise<void>((resolve) => { finish = resolve; });
    const view = setup();
    fireEvent.change(view.getByLabelText("Upload signature (PNG or JPEG)"), {
      target: { files: [new File(["fictional"], "mark.png")] },
    });
    fireEvent.click(view.getByRole("button", { name: "Clear signature" }));
    await act(async () => { finish(); });
    expect(view.getByText("Add a signature.")).toBeDefined();
    fireEvent.change(view.getByLabelText("Upload signature (PNG or JPEG)"), {
      target: { files: [new File(["fictional"], "mark.png")] },
    });
    fireEvent.click(view.getByRole("button", { name: "Start again" }));
    await act(async () => { finish(); });
    expect(view.getByText("Add a signature.")).toBeDefined();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it("locks placement during processing and discards a cancelled result", async () => {
    let finish!: (result: PdfResult) => void;
    engine.run.mockImplementation(() => new Promise<PdfResult>((resolve) => { finish = resolve; }));
    const view = setup();
    fireEvent.change(view.getByLabelText("Choose PDF files"), { target: { files: [pdf()] } });
    loadPage();
    draw();
    fireEvent.click(view.getByRole("button", { name: "Save signed PDF" }));
    await waitFor(() => expect(engine.run).toHaveBeenCalledOnce());
    expect(view.getByRole("button", { name: "Move signature" })).toHaveProperty("disabled", true);
    expect(view.getByLabelText("Page to sign").closest("fieldset")).toHaveProperty("disabled", true);
    fireEvent.click(view.getByRole("button", { name: "Start again" }));
    await act(async () => { finish(output); });
    expect(view.queryByRole("link", { name: "Download" })).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("can remove damaged input and sign a replacement without reloading", async () => {
    const view = setup();
    const picker = view.getByLabelText("Choose PDF files");
    fireEvent.change(picker, { target: { files: [pdf("damaged.pdf")] } });
    expect(view.getByRole("alert").textContent).toContain("damaged");
    fireEvent.click(view.getByRole("button", { name: "Remove damaged.pdf" }));
    fireEvent.change(picker, { target: { files: [pdf()] } });
    loadPage();
    draw();
    fireEvent.click(view.getByRole("button", { name: "Save signed PDF" }));
    await view.findByRole("link", { name: "Download" });
    cleanup();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local");
  });

  it("keeps a captured drag attached to the page when scrolling changes the page position", () => {
    const view = setup();
    fireEvent.change(view.getByLabelText("Choose PDF files"), { target: { files: [pdf()] } });
    loadPage();
    draw();
    const signature = view.getByRole("button", { name: "Move signature" });
    fireEvent.pointerDown(signature, { pointerId: 6, button: 0, clientX: 60, clientY: 560 });
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue({ left: 0, top: -80, width: 600,
      height: 800, bottom: 720, right: 600, x: 0, y: -80, toJSON: () => ({}) });
    fireEvent.pointerMove(signature, { pointerId: 6, clientX: 60, clientY: 560 });
    expect(parseFloat(signature.style.top)).toBeCloseTo(80);
    fireEvent.pointerCancel(signature, { pointerId: 6 });
    fireEvent.pointerMove(signature, { pointerId: 6, clientX: 200, clientY: 200 });
    expect(parseFloat(signature.style.top)).toBeCloseTo(80);
  });

  it("resizes proportionally with vertical handle movement as well as horizontal movement", () => {
    const view = setup();
    fireEvent.change(view.getByLabelText("Choose PDF files"), { target: { files: [pdf()] } });
    loadPage();
    draw();
    const handle = view.getByRole("button", { name: "Resize signature" });
    fireEvent.pointerDown(handle, { pointerId: 7, button: 0, clientX: 240, clientY: 620 });
    fireEvent.pointerMove(handle, { pointerId: 7, clientX: 240, clientY: 660 });
    fireEvent.pointerUp(handle, { pointerId: 7 });
    const signature = view.getByRole("button", { name: "Move signature" });
    expect(parseFloat(signature.style.width)).toBeCloseTo(50);
    expect(parseFloat(signature.style.height)).toBeCloseTo(12.5);
  });

  it("waits for the initial page and a newly selected page before saving proportional placement", async () => {
    const view = setup();
    draw();
    fireEvent.change(view.getByLabelText("Choose PDF files"), { target: { files: [pdf()] } });
    const save = view.getByRole("button", { name: "Save signed PDF" });
    expect(save).toHaveProperty("disabled", true);
    fireEvent.click(save);
    expect(engine.run).not.toHaveBeenCalled();
    loadPage();
    expect(save).toHaveProperty("disabled", false);
    fireEvent.change(view.getByLabelText("Page to sign"), { target: { value: "2" } });
    expect(save).toHaveProperty("disabled", true);
    fireEvent.click(save);
    expect(engine.run).not.toHaveBeenCalled();
    expect(view.queryByRole("button", { name: "Move signature" })).toBeNull();
    loadPage(800, 600);
    expect(save).toHaveProperty("disabled", false);
    fireEvent.click(save);
    await view.findByRole("link", { name: "Download" });
    expect(engine.run.mock.calls[0][0].options).toMatchObject({ page: 2, width: 0.3 });
    expect(engine.run.mock.calls[0][0].options.height).toBeCloseTo(0.3 * (800 / 600) / 3);
  });
});
