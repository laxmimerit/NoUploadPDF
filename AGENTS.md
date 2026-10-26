<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Use `npm run build:webpack` when checking the build locally in the sandbox.

## About NoUploadPDF

NoUploadPDF provides PDF tools that run in the browser. Files are never uploaded.

Read `docs/requirements.md`, `docs/decisions.md`, and `docs/tasks.md` at the start of each chat; tick tasks off when their done criteria pass, and update the relevant decision record when a decision changes.

## Where things live

- Pages live in `src/app`.
- The tool registry lives in `src/lib/tools.ts`.

## Check our work

- `npm run lint`
- `npm run typecheck`
- `npm run build:webpack`

## Code style

Keep new code lines under about 120 characters.
