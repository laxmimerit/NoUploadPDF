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

**Merge refinement (2026-10-27):** Registry configuration marks implemented tools and controls minimum file
counts and file ordering. Merge PDF requires two or more PDFs and copies every page in the displayed file order.
Accessible Move up and Move down buttons change that order; changing the selection or order clears the old result.
The download uses the first file's base name plus `-merged.pdf` (for example, `report-merged.pdf`).
Merge needs no extra options; unsupported job options and too few files produce recovery errors.
The cost is keeping file order, result invalidation, and registry availability consistent across the shared shell.

**Page-range tools refinement (2026-10-27):** Split PDF and Extract pages accept exactly one PDF.
A shared parser accepts comma-separated whole page numbers and inclusive ranges, with page numbers starting at 1.
Every part is checked before output creation. Invalid-option errors identify the part, explain the problem,
and preserve their correction message across the worker boundary. Other error codes keep fixed recovery copy.
Split produces one PDF per part, in input order; overlaps are allowed because outputs are separate files.
Extract deduplicates selected pages and saves them in source order. Pages outside the selection are omitted.
The registry owns availability, the options component choice, and the single-file limit.

Results retain the single-output shape for existing callers and add a multiple-output variant for Split PDF.
Every output buffer is transferred back, and the shell creates one download URL per PDF. Changing options,
changing files, reset, and unmount release those URLs. Separate links avoid a ZIP dependency and let visitors
choose which outputs to download; the cost is one download action per split PDF.

**Page-grid refinement (2026-10-27):** Rotate PDF and Reorder & delete share one thumbnail grid and the existing
shell lifecycle. The shell accepts a client preview renderer and invalidates results when serialized options change,
including button and drag edits. File objects, preview cancellation, result URL cleanup, and stale-reply protection
stay with their existing owners. The registry chooses the page-grid UI, single-file limit, and save button copy.

Options carry an ordered list of unique 1-based source pages and a quarter-turn delta for every source page.
The engine adds each delta to that page's existing rotation. Rotate preserves the complete original order;
Reorder & delete copies only retained pages in the chosen order. Empty, duplicate, out-of-range, malformed,
and non-quarter-turn plans are rejected with a reset/retry message. The UI also disables deletion of the last page.
Original page numbers stay on cards while position numbers show the new order. Dragging inserts before a target;
Earlier/Later buttons and Alt + arrows on a focused card provide keyboard movement. Delete removes a focused
card; focus follows moved pages or passes to a neighboring retained page. Reset page edits restores the source plan.
The page handle captures the primary pointer at press time and hit-tests the drop destination at release.
This keeps dragging attached to the chosen page when scrolling moves the small handle before movement starts.
A four-pixel movement threshold distinguishes clicks from drags; canceling or dropping outside the grid keeps
the order unchanged. The handle disables touch scrolling and text selection only within its own tap target.
Native drag events remain a fallback, and the existing keyboard movement and insertion rule stay the same.
Downloads use the source base name with `-rotated.pdf` or `-reordered.pdf`. The cost is retaining per-page state
and ensuring that preview deltas, source identities, and export order stay aligned. Reordering creates a new PDF
from copied pages, retaining its source title but not promising preservation of document-level metadata or outlines.

**Page-grid action visibility (2026-10-27):** Keep the existing workspace action row sticky at the viewport's
bottom when Rotate PDF or Reorder & delete has a selected file. Preserve the grid, card controls, and processing
lifecycle. Use the current theme surface and respect the device's bottom safe area. The row stays within its
workspace and keeps its original place in document and keyboard order. This avoids scrolling past every page
to save or download; the cost is reserving a strip of the editing viewport for the actions.

**Text overlays refinement (2026-10-27):** Page numbers and Watermark PDF each accept one PDF and
reuse the shared shell and worker lifecycle. Numbers use bottom centre, bottom right, or top right and any
safe integer start, including zero and negative values; reject a sequence that would exceed integer precision.
Watermarks accept 1–200 characters on one line, all pages or the existing range syntax, centre or diagonal
placement, and 5–50% opacity. Standard embedded Helvetica fonts keep processing local without a new font
dependency; unsupported characters receive a correction message. Text scales down within the visible page
but rejects sizes below six points. Crop/media intersection and existing quarter turns define placement.

The watermark placement preview runs the export operation in a separate local worker, then renders that
result with pdf.js. This keeps the preview and saved placement aligned without duplicating positioning math.
Preview changes cancel previous work and ignore late replies. Saving reuses an unchanged completed preview;
thumbnail batches follow their render generation, so regenerated files cannot append stale images.
The cost is an extra local PDF read and worker job while configuring a watermark. No document data or
watermark text leaves the browser. Source-based
filenames end in `-numbered.pdf` or `-watermarked.pdf`.

**Typed signature refinement (2026-10-27):** Sign PDF also accepts up to 80 typed characters.
Serve Sacramento Regular and its SIL Open Font License from `public/fonts`; the browser never contacts
a font provider. Wait for the font before rendering text to a transparent PNG, then use the existing
signature placement and worker export. Clear, reset, drawing, upload, or a text edit cancels pending rendering.
Explain that signatures are visible marks, not digital signatures. This adds a 78 KB font asset and a small
main-thread text rasterization step; drawing, image upload, placement, and PDF processing stay unchanged.

**Signature preservation refinement (2026-10-27):** Preserve form appearances as fixed Stamp annotations
in their original annotation order, rather than flattening widgets into page content. Keep their rectangles,
appearance matrices, visibility and print flags. Regenerate text and choice appearances when the form requests
`NeedAppearances`, including when an older saved appearance exists. Reject unsupported form appearances
and the ambiguous Invisible widget flag with advice to export a regular PDF copy. XFA remains unsupported.
Add the visible signature as the final printable Stamp so earlier annotations cannot cover it. These marks
are ordinary PDF annotations, not certificate signatures or tamper protection. Form fields cease to be editable.
The cost is retaining appearance annotations and depending on standard PDF viewer annotation support.
Save waits for the selected page's preview and proportional placement, tied to the exact current options.
Keep Sign PDF marked Coming soon until task 15's full browser, download and privacy checks pass.

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
The literal-credential rule exempts exactly `scripts/generate-test-fixtures.mjs`, `tests/pdf-errors.test.ts` and
`src/lib/pdf-engine/errors.ts`
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
jobs, and exact recovery messages. Keep small fictional files in `tests/fixtures`, regenerated with
`npm run fixtures:generate` using the existing PDF library. Test our validation and job behavior against real
file bytes; stub only the worker message port. Validation returns the page count it already reads, while jobs
for unfinished tools return `not-built`. Merge tests also reopen output with pdf.js and check visible text
in both file orders using two new labeled fixtures (seven fixtures total). These tests do not replace browser
checks for previews, worker buffer transfers, interaction, or privacy.
Vitest 4 supports the project's existing Node 20 type definitions and Node 24
runtime without a type-definition upgrade. It adds development dependencies only.

**Completion rule (2026-10-27):** Run `npm test`, `npm run lint`, `npm run typecheck`, and
`npm run build:webpack` for every implementation task. All four checks must pass before calling a task done
or ticking it off; failed, skipped, or blocked checks leave it unfinished. CI runs unit tests before the build.
The add-pdf-tool skill uses the same Vitest suite and shared fictional fixtures so future tools extend this baseline.
This catches regressions before completion; the cost is running the full check set for each task.

**Stop-hook refinement (2026-10-27):** The project hook in `.codex/hooks.json` runs `npm test` before
Codex finishes a turn. A failing or unavailable suite returns a blocking decision with test diagnostics.
The handler checks `stop_hook_active` first and skips a continued turn, so it can block at most once per turn.
A fresh turn runs the suite again. This uses Codex's event flag rather than persistent marker files.
The script resolves the project from its own location, so starting Codex in a subdirectory still tests the root.
The test process has a 240-second limit inside the hook's 300-second limit, and failure feedback is capped
at the last 12,000 characters. The cost is one additional unit-suite run per turn. The four-check completion
rule still applies, including when a continued turn's tests remain failing. Project hooks require Codex's
normal hook trust review before automatic execution; see [OpenAI's hook guide](https://learn.chatgpt.com/docs/hooks).

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

**Preview automation refinement (2026-10-27):** When `PLAYWRIGHT_BASE_URL` is set, Playwright sends
`x-vercel-skip-toolbar: 1` on every context request, including the first page navigation. Vercel documents
this automation opt-out in [Managing the toolbar](https://vercel.com/docs/vercel-toolbar/managing-toolbar#disable-toolbar-for-automation).
The setting changes only automated preview requests; local runs and normal visitors are unaffected.
Keep all privacy listeners and assertions unchanged. Do not intercept or ignore toolbar requests in the audit.

The first PR #16 browser run reached the page-grid tools' final network assertions after successful drag,
keyboard, download, reset, and narrow-layout checks, but failed six privacy cases. Vercel injected a toolbar
that posts login validation to `vercel.live`. Its public feedback script also calls `fetch(location.href)`
with method `HEAD` and `x-vercel-draft-status: 1` to probe draft-mode status. Those body-free HEAD requests
explain the page's own URL in the merge audit, which rejects every non-GET request. The same script sends
`OPTIONS /` to read `x-robots-tag` while deciding toolbar visibility. PR #16's saved HAR traces confirm
both kinds of requests with empty bodies; the draft-status HEAD responses return HTTP 204. The documented opt-out
prevents the injection instead of loosening the product's privacy checks. No deployment setting, credential,
dependency, or app behavior changes; the cost is a provider-specific header in preview test configuration.

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

## 5. Use the DESIGN.md home layout and shared navigation in both themes

Status: Accepted. Recorded: 2026-10-27. Updated: 2026-10-27.

**Question:** How should visitors understand the privacy promise and discover the tools?

**Decision:** Follow [DESIGN.md](../DESIGN.md): a spacious privacy-led hero with a working Merge PDF panel,
a fact strip, a searchable and category-filtered tool grid, a privacy explanation, and FAQs.
The home page may scroll on desktop and mobile. The hero includes a direct “Browse 11 tools” anchor.
This replaces the earlier requirement that every tool fit in a laptop's initial viewport.
Keep a sticky shared header with registry-driven category dropdowns and About. On mobile, use a menu sheet
with category accordions. Tool names, descriptions, availability, fixed routes, and processing output names
remain defined by the real app, even where the design's sample content differs.

Use the design's warm paper, ink, privacy green, Locked page logo, locally hosted Instrument Sans and
JetBrains Mono, flat bordered surfaces, and matching dark neutrals. The first visit follows the system theme;
manual choices persist locally. Apply the theme before paint and keep the toggle usable if storage is blocked.
No document data is stored by the theme setting.

**Why:** The larger layout explains the product's privacy model and gives tool discovery more readable space.
The user explicitly chose this design over the compact first-screen grid on 2026-10-27.
Shared navigation still makes every registry tool directly reachable from every page.

**What it costs:** Seeing all cards requires scrolling. Filters and mobile navigation add interactive states
and accessibility checks. Local fonts add asset weight but avoid runtime requests to a font provider.

**Truthful content (updated 2026-10-27):** Merge PDF, Split PDF, Extract pages, Rotate PDF, Reorder & delete,
Page numbers, and Watermark PDF have implementations; the other four retain “Coming soon”. Browser
verification remains pending in tasks 9–10; tasks 13–14 passed local browser checks.
PDF previews still work on unfinished pages. Split downloads separate PDFs, not a ZIP. Merge retains the first
file's base name plus `-merged.pdf`. Offline operation is not supported: loading the app and assets needs internet.
The design's offline fact and FAQ answer must not be used. Privacy green marks privacy, local processing,
and success; normal primary actions use ink.

**Navigation lifecycle refinement (2026-10-27):** Keep one page mounted at a time. A pathname-keyed
boundary in the root layout removes the previous route's Activity cache, including hidden home-card badges
and old PDF workspaces. Navigating to a different path starts fresh, including browser back/forward;
hash links within the current page preserve its filters and selected files. Header, footer, and theme remain
outside the boundary. This avoids stale document/result DOM and keeps tool availability specific to the
current page. The cost is losing page-local state when returning to a different path. Existing header visitor
assertions remain unchanged; only the design's replaced first-screen discovery checks need different expectations.

**Verification:** Replace the old first-screen tool-fit test with checks for the hero and browse anchor,
all eleven registry links and availability labels in the scrollable grid, the privacy anchor, and no horizontal
overflow at 1280×720, 1366×768, and 390×844 in light and dark. Retain the existing tool and worker regressions.
Check filtering, theme persistence, category dismissal, mobile menu, and keyboard focus separately.

## 6. Use Cantoo's PDF library for changes and pdf.js for previews

Status: Accepted. Recorded: 2026-10-27.

**Question:** Which libraries should power browser PDF work?

**Decision:** Use [`@cantoo/pdf-lib`](https://github.com/cantoo-scribe/pdf-lib) inside the shared engine
Web Worker for validation and future PDF changes. Use Mozilla's [pdf.js](https://mozilla.github.io/pdf.js/)
to draw page previews and export page images. Install both through npm and serve pdf.js worker, fonts, character maps,
and decoder assets from this app's own origin, without a CDN or document upload.
The initial pinned lockfile resolves `@cantoo/pdf-lib` 2.11.1 and `pdfjs-dist` 6.4.299.
The package preparation script runs before development and both build commands; generated assets are ignored
by Git and ESLint. Merge PDF, Split PDF, Extract pages, Rotate PDF, Reorder & delete, Page numbers,
and Watermark PDF have registered worker operations.
Unfinished tools return the not-built message.

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

**Converter refinement (2026-10-28):** PDF to images also uses pdf.js to render selected pages in the
existing worker, using worker-local canvases and locally served pdf.js assets. Multiple PNGs are packed into
one ZIP with fflate; a single page is returned as a PNG. Images to PDF decodes JPEG and PNG images in the
worker, applies browser image orientation, and embeds each image on a proportional page. These operations
are available; browser, lint, and build checks run in CI under the user’s current direction. The extra raster and ZIP
buffers increase memory use, so large jobs may require smaller batches.

## 7. Keep reusable test and review agents in the project

Status: Accepted. Recorded: 2026-10-27.

**Decision:** Define `test_writer` and `pdf_reviewer` in standalone TOML files under `.codex/agents/`.
Both set `model_reasoning_effort = "high"` and omit `model`, so they inherit the parent model unless
an explicit spawn or subagent default overrides it. Creating the definitions does not launch agents
or authorize automatic delegation. Invoke the appropriate named agent when delegation is requested.

The test writer may author only tests, test-only helpers, and fictional fixtures under `tests/`.
Implementation, documentation, configuration, and fixture-generator changes remain with the parent.
The reviewer reads the actual diff and project specifications, reports actionable findings with evidence,
and never edits files or runs commands that write them. The parent applies fixes and owns final checks.

**Why:** Persistent project roles preserve scope and review standards across delegation requests.
Tests should independently check observable PDF behavior; review should assess the specification and
the shared done criteria without silently changing the implementation under review.

**What it costs:** High-effort delegated runs consume additional tokens and time when invoked.
Custom agents inherit parent permissions; these role boundaries are instructions, not separate sandboxes.
The format follows the [official subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents).
No model, provider, permission profile, application behavior, or dependency is changed.


## 8. Offer two compression modes

Status: Accepted. Recorded: 2026-10-28.

**Decision:** Start with Clean up, which rewrites the PDF without downsampling images or changing pages.
Report both byte sizes and offer the original when the result is not smaller. Keep digitally signed files
unchanged because rewriting invalidates their signatures. Offer Scan as a separate mode for scanned PDFs; it reduces image resolution or quality and explains that
tradeoff before processing.

**Why:** Clean up provides a lossless first option, while scanned documents often need image reduction for
substantial savings. Do not use Ghostscript because its AGPL licence is unsuitable for this project.

**What it costs:** Clean up may produce little or no reduction. Scan uses two image quality settings and removes selectable text and interactive content; it warns
visitors before processing. Browser memory and processing limits still apply.

## 9. Stage dependency upgrades

Status: Accepted. Recorded: 2026-10-28.

**Decision:** Try the React and React DOM 19.3.1 patch upgrades individually, with checks after each.
Keep the other outdated direct dependencies at their current versions pending separate compatibility work.
The React install attempt was blocked by npm cache permissions. An approved retry was also blocked when
macOS denied removal of `node_modules/react/cjs`; both packages remain at 19.3.0.

**Why:** The React patches are the lowest-risk candidates and Next.js accepts React 19.x. ESLint 10,
TypeScript 7, and Vitest 5 have major-version changes that need their own migration and verification.
Node type definitions should be evaluated against the project's Node 24 runtime rather than jumping
from version 20 to the latest major, 26.

**What it costs:** The deferred packages remain outdated until that work is done. Passing unit tests and
type checking alone cannot establish browser behavior; CI must also check lint, the build, and visitor flows.
