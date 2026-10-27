// @vitest-environment jsdom

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToolShell } from "../src/components/tool-shell";

// Page rendering is separate from the shell's file-selection behavior.
vi.mock("@/components/pdf-previews", () => ({ PdfPreviews: () => null }));

afterEach(cleanup);

describe("tool shell file selection", () => {
  it("keeps one file and announces when another file has the same name and size", async () => {
    const data = new Uint8Array(await readFile(resolve("tests/fixtures/invoice.pdf"))).buffer;
    const original = new File([data], "invoice.pdf", { type: "application/pdf", lastModified: 1 });
    const duplicate = new File([data], "invoice.pdf", { type: "application/pdf", lastModified: 2 });

    render(createElement(ToolShell, { tool: "merge-pdf", toolName: "Merge PDF" }));
    const workspace = within(screen.getByRole("region", { name: "Merge PDF workspace" }));
    const picker = workspace.getByLabelText("Choose PDF files");

    fireEvent.change(picker, { target: { files: [original] } });
    expect(workspace.getAllByRole("listitem")).toHaveLength(1);
    expect(workspace.getByRole("button", { name: "Remove invoice.pdf" })).toBeDefined();

    fireEvent.change(picker, { target: { files: [duplicate] } });

    expect.soft(workspace.getAllByRole("listitem")).toHaveLength(1);
    expect.soft(workspace.getByRole("status").textContent).toBe("invoice.pdf is already in the list.");
  });
});
