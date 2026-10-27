// @vitest-environment jsdom

import { createElement } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToolGrid } from "../src/components/tool-grid";
import { ToolNavigation } from "../src/components/tool-navigation";
import { ThemeToggle } from "../src/components/theme-toggle";
import { groupedTools, tools } from "../src/lib/tools";

let darkSystem = false;
let systemChange: (() => void) | undefined;

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  darkSystem = false;
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    matches: query.includes("prefers-color-scheme") && darkSystem,
    addEventListener: (_: string, handler: () => void) => { systemChange = handler; },
    removeEventListener: vi.fn(),
  })));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("tool discovery", () => {
  it("shows all real tools with accurate availability, and combines category and search filters", () => {
    render(createElement(ToolGrid));
    const toolbox = within(screen.getByRole("region", { name: "Choose a tool" }));
    expect(toolbox.getAllByRole("link")).toHaveLength(11);
    expect(toolbox.getAllByText("Coming soon")).toHaveLength(8);
    for (const tool of tools) {
      expect(toolbox.getByRole("link", { name: tool.name }).getAttribute("href")).toBe(`/tools/${tool.slug}`);
    }
    fireEvent.click(toolbox.getByRole("button", { name: "Convert 2" }));
    expect(toolbox.getAllByRole("link")).toHaveLength(2);
    fireEvent.change(toolbox.getByRole("searchbox"), { target: { value: "images to" } });
    expect(toolbox.getAllByRole("link")).toHaveLength(1);
    expect(toolbox.getByRole("link", { name: "Images to PDF" })).toBeDefined();
    fireEvent.change(toolbox.getByRole("searchbox"), { target: { value: "merge" } });
    expect(toolbox.queryAllByRole("link")).toHaveLength(0);
    expect(toolbox.getByRole("status").textContent).toContain("No tools match");
    fireEvent.click(toolbox.getByRole("button", { name: "All 11" }));
    expect(toolbox.getByRole("link", { name: "Merge PDF" })).toBeDefined();
  });
});

describe("shared navigation", () => {
  it("opens only one category, closes outside, and returns keyboard focus on Escape", () => {
    render(createElement(ToolNavigation, { groups: groupedTools }));
    const organize = screen.getByRole("button", { name: "Organize" });
    const convert = screen.getByRole("button", { name: "Convert" });
    fireEvent.click(organize);
    expect(screen.getByRole("link", { name: "Merge PDF" })).toBeDefined();
    fireEvent.click(convert);
    expect(organize.getAttribute("aria-expanded")).toBe("false");
    const images = screen.getByRole("link", { name: "Images to PDF" });
    images.focus();
    fireEvent.keyDown(images, { key: "Escape" });
    expect(convert.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(convert);
    fireEvent.click(organize);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Toggle color theme" }));
    expect(organize.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(organize);
    fireEvent.pointerDown(document.body);
    expect(organize.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes the mobile sheet after picking a tool and restores body scrolling", () => {
    render(createElement(ToolNavigation, { groups: groupedTools }));
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Organize" }));
    const link = screen.getByRole("link", { name: "Merge PDF" });
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(link);
    expect(screen.getByRole("button", { name: "Open menu" }).getAttribute("aria-expanded")).toBe("false");
    expect(document.body.style.overflow).toBe("");
  });
});

describe("color theme", () => {
  it("follows the system on the first visit and saves an explicit choice", () => {
    darkSystem = true;
    render(createElement(ThemeToggle));
    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Toggle color theme" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
    systemChange?.();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("restores a saved choice instead of replacing it with the system setting", () => {
    localStorage.setItem("theme", "dark");
    render(createElement(ThemeToggle));
    expect(document.documentElement.dataset.theme).toBe("dark");
    cleanup();
    render(createElement(ThemeToggle));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("still switches themes when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Blocked"); });
    render(createElement(ThemeToggle));
    expect(document.documentElement.dataset.theme).toBe("light");
    fireEvent.click(screen.getByRole("button", { name: "Toggle color theme" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
