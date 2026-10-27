import { describe, expect, it } from "vitest";
import { parsePageRanges } from "../src/lib/pdf-engine/page-ranges";

describe("page ranges", () => {
  it("accepts the requested syntax and whitespace", () => {
    expect(parsePageRanges(" 1 - 3, 7, 10-12 ", 12)).toEqual([
      { start: 1, end: 3 }, { start: 7, end: 7 }, { start: 10, end: 12 },
    ]);
  });

  it.each([
    ["0", "Part 1 (\u201c0\u201d): page numbers start at 1."],
    ["5-2", "Part 1 (\u201c5-2\u201d): the start page 5 is after the end page 2."],
    ["1-3, 0", "Part 2 (\u201c0\u201d): page numbers start at 1."],
    ["1, 13", "Part 2 (\u201c13\u201d): this PDF has 12 pages"],
    ["1-13", "Part 1 (\u201c1-13\u201d): this PDF has 12 pages"],
    ["1,,3", "Part 2: a page or range is missing."],
    ["1,", "Part 2: a page or range is missing."],
    [",1", "Part 1: a page or range is missing."],
    ["1.5", "Part 1 (\u201c1.5\u201d): use a whole page number"],
    ["-1", "Part 1 (\u201c-1\u201d): use a whole page number"],
    ["1-2-3", "Part 1 (\u201c1-2-3\u201d): use a whole page number"],
    ["abc", "Part 1 (\u201cabc\u201d): use a whole page number"],
    ["99999999999999999999999999", "this PDF has 12 pages"],
  ])("identifies the bad part in %s", (value, message) => {
    expect(() => parsePageRanges(value, 12)).toThrow(message);
    expect(() => parsePageRanges(value, 12)).toThrow("Correct this part and try again.");
  });

  it.each(["", "  ", undefined, false, [1, 2], 1])("rejects an empty or non-text selection (%s)", (value) => {
    expect(() => parsePageRanges(value, 12)).toThrow("Enter page ranges");
  });
});
