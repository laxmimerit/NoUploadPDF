import { readFile } from "node:fs/promises";
import type { PdfInput } from "../src/lib/pdf-engine/protocol";

export async function readFixture(name: string): Promise<PdfInput> {
  const bytes = await readFile(new URL(`./fixtures/${name}`, import.meta.url));
  // Node Buffers may share a larger allocation; pass only this file's bytes.
  return { name, data: new Uint8Array(bytes).buffer };
}

export const validFixtures = [
  { name: "invoice.pdf", pages: 1 },
  { name: "report.pdf", pages: 12 },
] as const;

export const brokenFixtures = [
  { name: "damaged.pdf", code: "damaged" },
  { name: "password-protected.pdf", code: "password" },
  { name: "renamed-text.pdf", code: "not-pdf" },
] as const;
