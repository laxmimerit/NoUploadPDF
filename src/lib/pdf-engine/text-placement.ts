import { degrees, type PDFFont, type PDFPage } from "@cantoo/pdf-lib";
import { PdfError } from "./errors";

// Coordinates are relative to the visible, upright page, including its crop and existing rotation.
export function visiblePage(page: PDFPage) {
  const crop = page.getCropBox();
  const media = page.getMediaBox();
  const left = Math.max(crop.x, media.x);
  const bottom = Math.max(crop.y, media.y);
  const width = Math.min(crop.x + crop.width, media.x + media.width) - left;
  const height = Math.min(crop.y + crop.height, media.y + media.height) - bottom;
  const rotation = ((page.getRotation().angle % 360) + 360) % 360;
  if (width <= 0 || height <= 0 || ![0, 90, 180, 270].includes(rotation)) {
    throw new PdfError("invalid-options",
      "This page has an unsupported size or turn. Export a fresh PDF and try again.");
  }
  return {
    width: rotation % 180 ? height : width,
    height: rotation % 180 ? width : height,
    point(x: number, y: number) {
      if (rotation === 90) return { x: left + width - y, y: bottom + x };
      if (rotation === 180) return { x: left + width - x, y: bottom + height - y };
      if (rotation === 270) return { x: left + y, y: bottom + height - x };
      return { x: left + x, y: bottom + y };
    },
    angle: (angle = 0) => degrees(rotation + angle),
  };
}

export function textMetrics(font: PDFFont, text: string, size: number) {
  const ascent = font.heightAtSize(size, { descender: false });
  return { width: font.widthOfTextAtSize(text, size), ascent,
    descent: font.heightAtSize(size) - ascent };
}
