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
Updated 2026-10-27: The registry also drives the shared menu's tool-group dropdowns on every page; see decision 5.

Follow the existing [PDF engine rules](../src/lib/pdf-engine/AGENTS.md):

- No DOM, React, or `window` inside the engine.
- No `fetch` or analytics inside the engine; file contents never leave the browser.
- Keep one PDF operation per source file.

**Why:** A single registry avoids duplicated tool definitions. The shell makes tools consistent and reusable.
A shared engine centralizes PDF behavior, while the Web Worker keeps heavy processing off the main thread.

**What it costs:** Worker communication needs explicit job, result, and error handling.
Buffer transfers require careful ownership and cleanup to avoid unnecessary copies and memory growth.
Shared interfaces require coordination when tools change. Browser and worker support restrict library choices,
and workers still share the visitor's device and memory limits. The library choice is recorded in decision 6.

**Implementation refinement (2026-10-27):** Jobs carry an ID, fixed tool slug, file buffers, and options.
Replies carry that ID and progress, a result, or an error. Both client and worker reject concurrent jobs.
The client transfers fresh input buffers by default and offers an explicit retain-buffers mode for callers
that still need them. The shell retains browser File objects for previews and retry, rather than retaining
job buffers. Reset and unmount terminate the worker, cancel previews, revoke object URLs, and discard stale replies.

**File-selection refinement (2026-10-27):** The shell skips duplicate files by exact name and byte size,
including repeats within a selection, and announces each skipped name in its status line.
This avoids accidental repeats without reading or hashing file contents. Files with the same name and size
are treated as duplicates even if their contents differ. A selection containing only duplicates preserves
the existing result and error state.

## 3. Deliver every change through a pull request, CI, and a Vercel preview

Status: Accepted. Recorded: 2026-10-27.

**Question:** How do changes reach the main branch with repeatable checks and a reviewable result?

**Decision:** Every change goes through a pull request. CI must pass and the Vercel preview must be reviewed
before merge. Include what changed and how it was checked in the pull request.

CI already exists in `.github/workflows/ci.yml` and runs unit tests, lint, type checking, and a production build.
For local sandbox builds, use `npm run build:webpack`, as required by the repo instructions.
Vercel preview integration was verified through PR #8 on 2026-10-27, including deployed-page review.
Branch protection has not been verified; this record sets the required workflow without claiming it is configured.

**Shipping refinement (2026-10-27):** The repo-local `ship-it` skill is invoked only by name.
It creates a short `codex/` branch when starting on `main`, runs the required local checks and its staged/history
secret and identity guard, commits, then stops to show the commit and results. A subsequent explicit push
instruction authorizes pushing and creating or updating the branch's PR. The skill waits for CI and the matching
Vercel preview, then returns the preview link without opening it. Page checks use only the in-app browser.
Merging remains the user's decision; this workflow does not authorize an automatic merge.
The guard requires repository-local identity configuration and complete history, adds Python 3 as a local
prerequisite, and uses heuristic secret detection rather than guaranteeing that every possible secret is found.
The literal-credential rule exempts exactly `scripts/generate-test-fixtures.mjs` and `tests/pdf-errors.test.ts`
for the fictional locked-PDF fixture password and visitor-facing error copy. All other rules still apply
to these files, and every other file is fully checked, including identical content at another path.

**Local e2e exception (2026-10-27):** When Chromium cannot start in this Mac's agent sandbox before page
navigation, ship-it reports the limitation and defers e2e to the required pull-request CI check.
Confirmed startup evidence from the current session may be reused. Unit tests, lint, type checking,
the webpack build, and the secret/identity guard must still pass before committing.
Browser assertion failures and other test failures still block shipping. The e2e task stays unfinished
until its done criteria pass, and the PR e2e check must pass for the pushed commit before merge.

**Why:** Pull requests preserve review context. CI catches automated failures.
Previews let reviewers inspect the deployed behavior before it reaches the main site.

**What it costs:** Reviews and builds take time. CI and preview deployments consume their providers' allowances.
Deployment limits may delay work, and preview availability depends on the Vercel integration.
The workflow must remain within the free Hobby hosting constraint.

**Unit-test refinement (2026-10-27):** Use Vitest in Node for registry contracts, engine validation and worker
jobs, and exact recovery messages. Keep five small fictional files in `tests/fixtures`, regenerated with
`npm run fixtures:generate` using the existing PDF library. Test our validation and job behavior against real
file bytes; stub only the worker message port. Validation returns the page count it already reads, while jobs
for all tools still return `not-built`. These tests do not replace browser checks for previews, worker buffer
transfers, interaction, or privacy. Vitest 4 supports the project's existing Node 20 type definitions and Node 24
runtime without a type-definition upgrade. It adds development dependencies only.

**Completion rule (2026-10-27):** Run `npm test`, `npm run lint`, `npm run typecheck`, and
`npm run build:webpack` for every implementation task. All four checks must pass before calling a task done
or ticking it off; failed, skipped, or blocked checks leave it unfinished. CI runs unit tests before the build.
The add-pdf-tool skill uses the same Vitest suite and shared fictional fixtures so future tools extend this baseline.
This catches regressions before completion; the cost is running the full check set for each task.

**End-to-end refinement (2026-10-27):** Add Playwright with Chromium and the existing fictional fixtures.
Use visitor-visible links, labels, messages, and decoded thumbnails with real pdf.js previews and the real worker.
Test the home grid at 1280×720 and 1366×768, every header tool link, and the shared shell on Merge PDF.
Locally, build with `npm run build:webpack`, then run `npm run test:e2e`; Playwright starts an isolated
production server and refuses to reuse an existing server. `PLAYWRIGHT_BASE_URL` instead targets a public
deployment and disables the local server. Browser execution remains unverified because macOS denied Chromium
startup in this session, including the elevated retry; this records the chosen setup, not a passing browser run.

On pull requests only, CI's `e2e` job depends on successful `checks`, checks out the PR head SHA, and polls
GitHub deployments for that same SHA for up to 20 minutes. Accept the latest non-production Preview deployment
from `vercel[bot]` only when its current status succeeds and supplies an HTTPS `environment_url`.
Fail on deployment failure, error, inactivity, or timeout; do not reuse older successful statuses or branch URLs.
Use GitHub's automatic token with read-only contents and deployments permissions. Public previews need no
repository secrets, Vercel token, or protection bypass. Retain reports, failure screenshots, and traces for
seven days. Unit tests cover the polling behavior; the hosted job still requires a PR run after the user pushes.
This adds a development dependency, a Chromium download, CI runner time, and short-lived report storage.
No hosting service or paid processing is introduced. See `tests/e2e/README.md` for commands and troubleshooting.

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

## 5. Put tool discovery in the first screen and navigation on every page

Status: Accepted. Recorded: 2026-10-27.

**Question:** How should visitors understand the site and find its tools immediately?

**Decision:** Use a compact home-page introduction with every tool visible and directly linked without scrolling.
Put a shared menu at the top of every page with one registry-driven dropdown per tool group and an About link.
Deliver this work before the shared tool shell.

**Why:** The current large hero fills the first screen and pushes tools below it, leaving visitors unsure what
the site does. Immediate tool visibility and consistent navigation make the site's purpose and choices clear.

**What it costs:** The first-screen requirement limits space for hero content and tool-card detail.
Dropdowns need keyboard and touch support.

**Refinement (2026-10-27):** Fit the complete grouped grid in a laptop's first screen; narrow screens may scroll
to keep links readable. Use a short headline and one supporting line. Put the logo and name on the left of the
shared header, followed by dropdowns whose groups and tools are derived from the registry, then About.
About must distinguish the browser-only design from today's state: all tools are still coming soon.

## 6. Use Cantoo's PDF library for changes and pdf.js for previews

Status: Accepted. Recorded: 2026-10-27.

**Question:** Which libraries should power browser PDF work?

**Decision:** Use [`@cantoo/pdf-lib`](https://github.com/cantoo-scribe/pdf-lib) inside the shared engine
Web Worker for validation and future PDF changes. Use Mozilla's [pdf.js](https://mozilla.github.io/pdf.js/)
only to read and draw page previews. Install both through npm and serve pdf.js worker, fonts, character maps,
and decoder assets from this app's own origin, without a CDN or document upload.
The initial pinned lockfile resolves `@cantoo/pdf-lib` 2.11.1 and `pdfjs-dist` 6.4.299.
The package preparation script runs before development and both build commands; generated assets are ignored
by Git and ESLint. No tool operation is registered yet, so validated jobs return the not-built message.

**Why:** The original [`pdf-lib` has had no release since 2021](https://github.com/Hopding/pdf-lib/releases).
Cantoo maintains a compatible fork that works in a Web Worker. Keeping modifications in that worker preserves
interaction responsiveness. pdf.js supplies page rendering, keeping the two libraries' responsibilities clear.

**What it costs:** Two PDF libraries increase download size and dependency maintenance.
pdf.js loads only after file selection; the modification library is bundled into the job worker.
Each preview and job reads its own bytes from the retained File; pdf.js can transfer its preview buffer,
while job buffers are separately transferred to the engine. Documents and thumbnails still consume device memory.
Previews render serially at bounded thumbnail resolution and release parser and canvas resources afterward.
Generated pdf.js assets must match the installed package version. These dependencies use modern browser APIs;
unsupported browsers receive a recovery error. No server processing or paid service is introduced.
