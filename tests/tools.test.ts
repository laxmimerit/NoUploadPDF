import { describe, expect, it } from "vitest";
import { groupedTools, toolGroups, tools } from "../src/lib/tools";

describe("tool registry", () => {
  it("makes both overlay tools available with single-file configuration", () => {
    for (const slug of ["page-numbers", "watermark-pdf"]) {
      expect(tools.find((tool) => tool.slug === slug)).toMatchObject({ available: true, maxFiles: 1 });
    }
    expect(tools.filter((tool) => tool.available)).toHaveLength(7);
  });
  it("preserves the eleven public route slugs and their groups", () => {
    expect(tools.map(({ slug, group }) => [slug, group])).toEqual([
      ["merge-pdf", "Organize"],
      ["split-pdf", "Organize"],
      ["extract-pages", "Organize"],
      ["rotate-pdf", "Organize"],
      ["reorder-delete", "Organize"],
      ["images-to-pdf", "Convert"],
      ["pdf-to-images", "Convert"],
      ["page-numbers", "Edit"],
      ["watermark-pdf", "Edit"],
      ["sign-pdf", "Edit"],
      ["compress-pdf", "Optimize"],
    ]);
  });

  it("has unique URL-safe slugs and non-empty display metadata", () => {
    expect(new Set(tools.map(({ slug }) => slug)).size).toBe(tools.length);
    for (const tool of tools) {
      expect(tool.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(tool.name.trim()).not.toBe("");
      expect(tool.description.trim()).not.toBe("");
      expect(tool.icon.trim()).not.toBe("");
    }
  });

  it("groups every tool once, in registry order, using the same entries", () => {
    expect(toolGroups).toEqual(["Organize", "Convert", "Edit", "Optimize"]);
    expect(groupedTools.map(({ group }) => group)).toEqual(toolGroups);
    const entries = groupedTools.flatMap(({ tools }) => tools);
    expect(entries).toHaveLength(tools.length);
    for (const tool of tools) {
      expect(entries.filter((entry) => entry === tool)).toHaveLength(1);
    }
    for (const group of groupedTools) {
      expect(group.tools).toEqual(tools.filter((tool) => tool.group === group.group));
    }
  });
});
