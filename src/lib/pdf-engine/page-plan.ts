import { PdfError } from "./errors";
import type { PdfJob } from "./protocol";

export function pagePlan(job: PdfJob, count: number, organize: boolean) {
  const { order, rotations } = job.options;
  const fail = (message: string): never => {
    throw new PdfError("invalid-options", `${message} Reset page edits and try again.`);
  };
  if (Object.keys(job.options).some((key) => !["order", "rotations"].includes(key))) {
    fail("The page options are not supported.");
  }
  if (!Array.isArray(order) || !order.length) return fail("Keep at least one page.");
  if (order.some((page) => !Number.isInteger(page) || page < 1 || page > count)
    || new Set(order).size !== order.length) return fail("Choose each valid page only once.");
  if (!organize && (order.length !== count || order.some((page, index) => page !== index + 1))) {
    fail("Rotate PDF keeps every page in its original order.");
  }
  if (!Array.isArray(rotations) || rotations.length !== count
    || rotations.some((turn) => ![0, 90, 180, 270].includes(turn))) {
    return fail("Use quarter turns of 0, 90, 180, or 270 degrees for each page.");
  }
  return { order, rotations };
}

export function pageOutputName(name: string, suffix: string) {
  return `${name.replace(/\.pdf$/i, "") || "document"}-${suffix}.pdf`;
}
