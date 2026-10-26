# NoUploadPDF decisions

These records explain the architecture and delivery workflow for the [requirements](requirements.md).
Accepted decisions guide future work; they do not imply that the planned components already exist.
Track implementation in the [task checklist](tasks.md).
When a decision changes, update its record with the new decision, reason, costs, and date of the change.

## 1. Process every file in the visitor's browser

Status: Accepted. Recorded: 2026-10-27.

**Question:** Where should PDF and image processing happen?

**Decision:** Process every file in the visitor's browser. Never upload file contents or derived document data.
Do not use a server or an external processing API for PDF operations.

**Why:** Local processing protects private documents, avoids upload time, and removes server-processing costs.
It supports the product's speed and privacy promises and keeps processing within the free Hobby hosting constraint.

**What it costs:** The visitor's device does the work and uses its own CPU, battery, and memory.
A browser tab has limited memory, so large documents may fail or need smaller batches.
Heavy jobs might need a server later; that would require explicitly revisiting this decision and the privacy promise,
as well as the hosting budget. There must be no silent server fallback.

## 2. Use one registry, one shared shell, and one worker engine

Status: Accepted. Recorded: 2026-10-27.

**Question:** How should eleven tools share navigation, interaction, and PDF processing?

**Decision:** Keep one tool registry in `src/lib/tools.ts`, one shared tool shell, and one shared PDF engine
running in a Web Worker. The registry drives home-page cards and tool pages.
The shell owns file selection, options, progress, errors, downloads, and reset.
The engine owns PDF operations and communicates with the shell through worker messages.

Follow the existing [PDF engine rules](../src/lib/pdf-engine/AGENTS.md):

- No DOM, React, or `window` inside the engine.
- No `fetch` or analytics inside the engine; file contents never leave the browser.
- Keep one PDF operation per source file.

**Why:** A single registry avoids duplicated tool definitions. The shell makes tools consistent and reusable.
A shared engine centralizes PDF behavior, while the Web Worker keeps heavy processing off the main thread.

**What it costs:** Worker communication needs explicit job, result, and error handling.
Buffer transfers require careful ownership and cleanup to avoid unnecessary copies and memory growth.
Shared interfaces require coordination when tools change. Browser and worker support restrict library choices,
and workers still share the visitor's device and memory limits. PDF-library selection is deferred to implementation.

## 3. Deliver every change through a pull request, CI, and a Vercel preview

Status: Accepted. Recorded: 2026-10-27.

**Question:** How do changes reach the main branch with repeatable checks and a reviewable result?

**Decision:** Every change goes through a pull request. CI must pass and the Vercel preview must be reviewed
before merge. Include what changed and how it was checked in the pull request.

CI already exists in `.github/workflows/ci.yml` and runs lint, type checking, and a production build.
For local sandbox builds, use `npm run build:webpack`, as required by the repo instructions.
Vercel preview integration and branch protection have not been verified; this record sets the required workflow,
without claiming those controls are configured.

**Why:** Pull requests preserve review context. CI catches automated failures.
Previews let reviewers inspect the deployed behavior before it reaches the main site.

**What it costs:** Reviews and builds take time. CI and preview deployments consume their providers' allowances.
Deployment limits may delay work, and preview availability depends on the Vercel integration.
The workflow must remain within the free Hobby hosting constraint.

## 4. Give each tool a fixed registry slug

Status: Accepted. Recorded: 2026-10-27.

**Question:** How should tool page addresses stay stable when display names change?

**Decision:** Give every entry in `src/lib/tools.ts` an explicit, unique, fixed `slug`.
Use `/tools/<slug>` for its page address. Home-page links, route lookup, and generated pages use that slug,
never a value derived from the display name. Page names and descriptions still come from the registry.
Renaming a tool must leave its slug and existing links unchanged.

**Why:** Shared links and bookmarks should keep working after a display-name change.
Keeping route identifiers in the registry preserves one source of truth for tool navigation.

**What it costs:** Slugs must be kept unique and maintained separately from display names.
Any future intentional URL change needs an explicit migration and redirect for the old address.
With Cache Components enabled, a registry check in `src/proxy.ts` rejects unknown tool paths before streaming
starts, so they return HTTP 404 instead of a streamed 200 response containing not-found UI.
