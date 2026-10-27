// @vitest-environment jsdom

import { createElement, useEffect, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PdfPageGrid } from "../src/components/page-grid-tool";

vi.mock("@/components/pdf-previews", () => ({
  PdfPreviews: ({ onReady, children }: { onReady: (count: number) => void;
    children: (thumbnails: { page: number; url: string }[]) => ReactNode }) => {
    useEffect(() => { onReady(4); }, [onReady]);
    return children([1, 2, 3, 4].map((page) => ({ page, url: `blob:page-${page}` })));
  },
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function setup(organize = true, disabled = false) {
  const onChange = vi.fn();
  const props = { file: new File(["fictional"], "report.pdf"), organize, disabled, onChange,
    onReady: vi.fn(), onError: vi.fn() };
  const view = render(createElement(PdfPageGrid, props));
  const order = () => screen.getAllByRole("listitem").map((card) => card.getAttribute("aria-label"));
  return { ...view, onChange, order, props };
}

describe("shared PDF page grid", () => {
  it("adds each turn, wraps after four turns, and offers only rotation controls in Rotate", () => {
    const { onChange } = setup(false);
    const right = screen.getByRole("button", { name: "Turn page 2 right 90 degrees" });
    for (const turn of [90, 180, 270, 0]) {
      fireEvent.click(right);
      expect(onChange.mock.lastCall?.[0].rotations).toEqual([0, turn, 0, 0]);
    }
    fireEvent.click(screen.getByRole("button", { name: "Turn all left" }));
    expect(onChange.mock.lastCall?.[0].rotations).toEqual([270, 270, 270, 270]);
    expect(screen.queryByRole("button", { name: /Delete page/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Move page/ })).toBeNull();
    expect(screen.getAllByRole("img")).toHaveLength(4);
  });

  it("moves using buttons and keyboard, keeps the page's turn, deletes, and restores original pages", () => {
    const { onChange, order } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Turn page 4 right 90 degrees" }));
    fireEvent.click(screen.getByRole("button", { name: "Move page 4 earlier" }));
    const fourth = screen.getByRole("listitem", { name: "Page 4, position 3 of 4" });
    expect(document.activeElement).toBe(fourth);
    fireEvent.keyDown(fourth, { key: "ArrowLeft", altKey: true });
    fireEvent.keyDown(fourth, { key: "ArrowUp", altKey: true });
    expect(order()[0]).toContain("Page 4, position 1");
    expect(onChange.mock.lastCall?.[0].rotations).toEqual([0, 0, 0, 90]);
    fireEvent.click(screen.getByRole("button", { name: "Delete page 3" }));
    const first = screen.getByRole("listitem", { name: "Page 1, position 2 of 3" });
    fireEvent.keyDown(first, { key: "Delete" });
    fireEvent.click(screen.getByRole("button", { name: "Delete page 2" }));
    expect(onChange.mock.lastCall?.[0].order).toEqual([4]);
    const lastDelete = screen.getByRole("button", { name: "Delete page 4" }) as HTMLButtonElement;
    expect(lastDelete.disabled).toBe(true);
    fireEvent.keyDown(screen.getByRole("listitem"), { key: "Delete" });
    expect(onChange.mock.lastCall?.[0].order).toEqual([4]);
    fireEvent.click(screen.getByRole("button", { name: "Reset page edits" }));
    expect(onChange.mock.lastCall?.[0]).toEqual({ order: [1, 2, 3, 4], rotations: [0, 0, 0, 0] });
  });

  it("inserts a dragged page before its drop target", () => {
    const { onChange } = setup();
    const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
    fireEvent.dragStart(screen.getByRole("button", { name: /^Drag page 4;/ }), { dataTransfer });
    const target = screen.getByRole("listitem", { name: "Page 2, position 2 of 4" });
    fireEvent.dragOver(target, { dataTransfer });
    expect(target.dataset.dropTarget).toBe("true");
    fireEvent.drop(target, { dataTransfer });
    expect(onChange.mock.lastCall?.[0].order).toEqual([1, 4, 2, 3]);
  });

  it("moves from the captured handle after scrolling without requiring a native drag-start event", () => {
    vi.stubGlobal("PointerEvent", class extends MouseEvent {
      pointerId: number;
      isPrimary: boolean;
      constructor(type: string, init: PointerEventInit) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
        this.isPrimary = init.isPrimary ?? true;
      }
    });
    const { onChange } = setup();
    const handle = screen.getByRole("button", { name: /^Drag page 4;/ });
    const target = screen.getByRole("listitem", { name: "Page 2, position 2 of 4" });
    const image = within(target).getByRole("img");
    const capture = vi.fn();
    Object.defineProperty(handle, "setPointerCapture", { value: capture });
    const previousHitTest = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
    const hitTest = vi.fn(() => image);
    Object.defineProperty(document, "elementFromPoint", { configurable: true, value: hitTest });
    try {
      fireEvent.pointerDown(handle, { pointerId: 7, button: 0, clientX: 1047, clientY: 404 });
      expect(capture).toHaveBeenCalledWith(7);
      // Scrolling changes where the handle is. Captured events still reach it while hit-testing the target.
      fireEvent.pointerMove(handle, { pointerId: 7, clientX: 527, clientY: 508 });
      expect(target.dataset.dropTarget).toBe("true");
      fireEvent.pointerUp(handle, { pointerId: 7, clientX: 527, clientY: 508 });
      expect(onChange.mock.lastCall?.[0].order).toEqual([1, 4, 2, 3]);
      expect(screen.getByRole("listitem", { name: "Page 4, position 2 of 4" })).toBeDefined();
      expect(hitTest).toHaveBeenCalledWith(527, 508);
    } finally {
      if (previousHitTest) Object.defineProperty(document, "elementFromPoint", previousHitTest);
      else Reflect.deleteProperty(document, "elementFromPoint");
    }
  });

  it("locks edits while processing and keeps controls labeled", () => {
    const { onChange } = setup(true, true);
    onChange.mockClear();
    screen.getAllByRole("button").forEach((button) => expect((button as HTMLButtonElement).disabled).toBe(true));
    const card = screen.getAllByRole("listitem")[1];
    fireEvent.keyDown(card, { key: "Delete" });
    fireEvent.keyDown(card, { key: "ArrowUp", altKey: true });
    fireEvent.click(within(card).getByRole("button", { name: "Turn page 2 left 90 degrees" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
