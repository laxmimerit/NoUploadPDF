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
- Add Vitest unit tests under `tests/` with names ending in `.test.ts`, as discovered by `vitest.config.mts`.
  Import test helpers from `vitest` and reuse `readFixture` from `tests/fixtures.ts`.
  Read `tests/fixtures/README.md`: `invoice.pdf` has one page, `report.pdf` has twelve, and `damaged.pdf`,
  `password-protected.pdf`, and `renamed-text.pdf` exercise damaged, password, and non-PDF errors.
  Regenerate fixtures with `npm run fixtures:generate` when needed; extend the generator with made-up content
  if the tool needs another known fixture. Never use real documents as test data.
- Test our operation and job behavior with the fixture bytes. Reopen output and assert the task's observable
  result, unchanged content where relevant, invalid options, and useful errors for unsupported or broken input.
  Keep assertions about our behavior rather than PDF-library internals. Update `tests/pdf-worker.test.ts` so
  the implemented tool has success coverage and only unfinished tools are expected to return `not-built`.

## Verify and finish

- Apply the shared and tool-specific done criteria in `docs/tasks.md`. Reopen downloaded output;
  check invalid input/options, retry, processing, download, reset, keyboard access, and narrow layout.
  Inspect network activity during selection, processing, and download for transmitted document data.
- Never use Chrome or Computer Use; Codex's in-app browser is fine for checking pages.
- Run the full Vitest suite with `npm test`, then `npm run lint`, `npm run typecheck`, and `npm run build:webpack`.
  Every check must pass before saying done or ticking off the task. Report failed, skipped, or blocked checks
  and keep the task unfinished until they pass. CI must run unit tests before its build.
- Remove “Coming soon” only for the completed tool. Update its page and shell copy; keep site-wide copy
  truthful in `src/app/page.tsx`, `src/app/about/page.tsx`, and `src/app/layout.tsx`.
  Update current state in `docs/requirements.md`, tick only the matching task after its criteria pass,
  and record checks in `docs/tasks.md`. Update `docs/decisions.md` if a decision changes.
- Follow decision 3's PR, CI, and Vercel preview workflow; report any pending checks honestly.
  Finish with short, plain sentences explaining the change and how it was checked.
