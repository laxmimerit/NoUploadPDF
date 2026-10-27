---
name: add-pdf-tool
description: >-
  Implement a NoUploadPDF registry tool end to end. Use only when explicitly called as
  $add-pdf-tool with a tool name, such as $add-pdf-tool Rotate PDF.
---

# Add PDF tool

Work from the repository root. Implement the named registry tool through a downloadable, verified result.

## Read first

- Read `AGENTS.md`, `docs/requirements.md`, `docs/decisions.md`, and `docs/tasks.md`.
  Find the requested name in `src/lib/tools.ts` and its task (6–16); preserve its fixed slug.
- Read `src/app/tools/[slug]/page.tsx`, `src/components/tool-shell.tsx`,
  `src/lib/pdf-worker-client.ts`, and `src/lib/pdf-engine/{AGENTS.md,worker.ts,protocol.ts,errors.ts,validate-pdf.ts}`.
  Recheck current code before choosing changes. Read the relevant installed guide in
  `node_modules/next/dist/docs/` before writing Next.js code.

## Implement

- Update the entry in `src/lib/tools.ts` with any availability or configuration needed by the tool.
  Keep names, descriptions, groups, slugs, and availability registry-driven.
- Wire the tool page to a client options component using `ToolShell`'s `options` and `children` props.
  Reuse its selection, progress, errors, download, and reset lifecycle; extend shared interfaces only as needed.
- Add one operation source file under `src/lib/pdf-engine/` and register it by slug in `worker.ts`'s
  `operations` map. Use `@cantoo/pdf-lib` for PDF changes. Adapt `protocol.ts`, `validate-pdf.ts`,
  and the shell when the tool needs images or multiple outputs; the current result holds one buffer.
- Keep files, derived images, and signatures in the browser. No uploads, external processing, or analytics
  containing document data. The engine has no DOM, React, `window`, or `fetch`.
- Keep browser `File` objects for previews and retries. Transfer fresh input buffers through
  `src/lib/pdf-worker-client.ts` and transfer result buffers back. Preserve cancellation, stale-reply guards,
  and object-URL cleanup. Show plain errors through `PdfError` in `errors.ts`, including invalid options
  through `protocol.ts`'s error codes, with a useful correction and retry path.
- Add a unit test beside the operation using a small, known PDF fixture, generated locally where practical.
  Reopen output and assert the task's observable result, unchanged content where relevant, and invalid options.
  Check `package.json` for test support; if still absent, add a minimal repeatable test command and run it.

## Verify and finish

- Apply the shared and tool-specific done criteria in `docs/tasks.md`. Reopen downloaded output;
  check invalid input/options, retry, processing, download, reset, keyboard access, and narrow layout.
  Inspect network activity during selection, processing, and download for transmitted document data.
- Check pages only in Codex's in-app browser. Never use Chrome or Computer Use.
- Run the unit test, `npm run lint`, `npm run typecheck`, and `npm run build:webpack` before saying done.
- Remove “Coming soon” only for the completed tool. Update its page and shell copy; keep site-wide copy
  truthful in `src/app/page.tsx`, `src/app/about/page.tsx`, and `src/app/layout.tsx`.
  Update current state in `docs/requirements.md`, tick only the matching task after its criteria pass,
  and record checks in `docs/tasks.md`. Update `docs/decisions.md` if a decision changes.
- Follow decision 3's PR, CI, and Vercel preview workflow; report any pending checks honestly.
  Finish with short, plain sentences explaining the change and how it was checked.
