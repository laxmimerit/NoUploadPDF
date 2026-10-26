import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const source = path.dirname(require.resolve("pdfjs-dist/package.json"));
const destination = path.join(process.cwd(), "public/pdfjs");
await mkdir(destination, { recursive: true });
for (const folder of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  await cp(path.join(source, folder), path.join(destination, folder), { recursive: true });
}
await cp(path.join(source, "build/pdf.worker.min.mjs"), path.join(destination, "pdf.worker.min.mjs"));
