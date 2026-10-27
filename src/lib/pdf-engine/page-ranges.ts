import { PdfError } from "./errors";

export type PageRange = { start: number; end: number };

// Validate every part before allocating page indices or creating any output.
export function parsePageRanges(value: unknown, pageCount: number): PageRange[] {
  if (typeof value !== "string" || !value.trim()) {
    throw new PdfError("invalid-options", "Enter page ranges, for example 1-3, 7, 10-12, and try again.");
  }
  return value.split(",").map((part, index) => {
    const text = part.trim();
    const label = text ? `Part ${index + 1} (\u201c${text}\u201d)` : `Part ${index + 1}`;
    function invalid(reason: string): never {
      throw new PdfError("invalid-options", `${label}: ${reason} Correct this part and try again.`);
    }
    if (!text) invalid("a page or range is missing.");
    const match = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(text);
    if (!match) invalid("use a whole page number or a range like 1-3.");
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < 1) invalid("page numbers start at 1.");
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > pageCount || end > pageCount) {
      invalid(`this PDF has ${pageCount} ${pageCount === 1 ? "page" : "pages"}; use numbers from 1 to ${pageCount}.`);
    }
    if (start > end) invalid(`the start page ${start} is after the end page ${end}.`);
    return { start, end };
  });
}

export function rangeIndices({ start, end }: PageRange): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start - 1 + index);
}
