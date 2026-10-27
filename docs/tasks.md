# NoUploadPDF tasks

Use the [requirements](requirements.md) and [decisions](decisions.md) at the start of each task.
Each numbered task is intended for one chat. Unchecked tasks may have work awaiting final verification.
Tick a task off only when its done criteria pass, and report the checks performed.

## Shared done criteria

For every implementation task, run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build:webpack`.
Every check must pass before saying the task is done or ticking it off.
If a check fails, is skipped, or is blocked, report it and keep the task unfinished.
Use the pull request, CI, and Vercel preview workflow from decision 3.
Read the relevant installed Next.js guide before writing framework code.

For every tool task (6–16), also:

- Use the shared shell and worker engine, with one operation per engine source file.
- Reopen downloaded output and check the task's observable results with small, known fixtures.
- Check unsupported or corrupt input and invalid options; show a useful error and allow a valid retry without reload.
- Check processing, error, download, and reset states, including keyboard access.
- Inspect browser network activity while selecting files, processing, and downloading.
  Confirm no file contents, derived images, or signatures are transmitted.
- Remove "Coming soon" for that tool only when its done criteria pass; keep other unfinished tools marked.

## Checklist

- [ ] **Merge, number, and compress PDFs in one run.**
  - Deliverable: Reuse the three worker operations in order with compression mode and quality choices.
    Show named step failures with no download and retain the numbered PDF when compression cannot reduce it.
  - Done: Focused unit tests and type checking pass locally; CI verifies lint, production build, and browser
    criteria. Review result PDFs and confirm a damaged middle input stops the run.
  - Progress (2026-10-28): Added the chain and focused tests, including a damaged middle file, named failures,
    retry, and a smaller rendered Scan result. The PDF reviewer reopened fictional results and found no
    actionable issue. Twelve focused test files (99 tests) and type checking pass. The visitor test, CI lint,
    production build, and preview review remain pending. Clean up returned the numbered fallback in the
    fixtures tested; a smaller Clean up result has not been observed.

- [ ] **Preserve visible filled form values in copied-page outputs.**
  - Found (2026-10-27): The parallel `pdf_reviewer` review of the five Organize tools reproduced
    existing content loss in Merge PDF, Split PDF, Extract pages, and Reorder & delete. A filled text
    widget with a value, no saved appearance, and `NeedAppearances=true` renders in the source but
    becomes blank after copying into a new PDF. Rotate PDF retains the source document.
  - Regression evidence (2026-10-27): `tests/organize-form-content.test.ts` renders fictional source
    and output files locally. Source and Rotate assertions pass; four explicit `it.fails` assertions
    document the copied-page defect. Setup and rendering errors fail normally. No production fix was made.
  - Done: Preserve visible form values in all four copied-page operations. Reopen and render fictional
    outputs with pdf.js, replace the known-failure assertions with ordinary passing regressions,
    and pass all four required repository checks.

- [x] **Add persistent project test and review agents.**
  - Deliverable: `.codex/agents/test_writer.toml` and `.codex/agents/pdf_reviewer.toml` with high reasoning
    effort and no model field. The test writer authors only tests and fictional test fixtures; the reviewer
    checks changes against the specification and never edits files.
  - Done: Parse both definitions as TOML, confirm required fields, role boundaries, high effort, and omitted
    model overrides. Run the four required repository checks. Record discovery evidence separately from
    live execution, and do not claim a custom agent has run unless it actually has.
  - Progress (2026-10-27): Added both project-scoped definitions. TOML parsing confirms the required name,
    description, and developer instructions, high reasoning effort, and no model field. Instructions restrict
    the test writer to tests and fictional test fixtures and prohibit every reviewer edit or writing command.
    The format and inherited-permission behavior match the current official subagent documentation.
    All 205 unit tests, lint, type checking, and the webpack build pass. Used fresh output directories
    `.next/custom-agents-types-20261027` and `.next/custom-agents-build-20261027` to avoid the known cache
    cleanup error; restored temporary Next/TypeScript configuration exactly.
    Runtime discovery remains unverified: `codex debug prompt-input` failed in the sandbox, and the elevated
    retry failed while loading AGENTS.md with `sandbox-exec: sandbox_apply: Operation not permitted`.
    No live custom agent was started. Keep this task unchecked pending discovery verification.
  - Live invocation (2026-10-27): Started the named `pdf_reviewer` and `test_writer` roles concurrently
    for the five Organize tools. Both returned their assigned work. The reviewer made no edits;
    the test writer changed tests only. Rechecked both definitions with Python 3.13 TOML parsing:
    required fields, high reasoning effort, and no model override all pass. This verifies live discovery
    separately from the earlier failed debug command.
  - Completion (2026-10-27): The test writer added 15 tests in three files. Focused checks report
    16 passing assertions and four expected failures across 20 cases; the four expected failures expose
    the unresolved form-content bug above, rather than certifying correct product behavior. The reviewer
    inspected all additions and found no issues in the tests. Lint, type checking, and the webpack build
    pass. Type checking first caught an options annotation in the new test; corrected it and reran.
    Normal and elevated builds hit the existing cache cleanup EPERM; fresh output under
    `.next/five-tools-review-final-1793121535884319000` passed. Restored Next.js/TypeScript configuration
    exactly. Browser/download/network verification for tasks 9–10 remains pending; those tasks stay unchecked.

- [x] **Run unit tests before Codex finishes a turn.**
  - Deliverable: A project Stop hook in `.codex/hooks.json` runs `npm test`, continues Codex on failure,
    and blocks at most once per turn.
  - Done: Exercise passing and failing test runs, confirm a continued turn cannot block again and a new
    turn checks again, and pass all four required checks.
  - Completion (2026-10-27): Added the Stop hook and a Node handler guarded by `stop_hook_active`.
    Four integration cases execute the configured command with real passing/failing unit-test fixtures,
    repeated continuations, a fresh turn, subdirectory/path-with-spaces execution, and an unavailable suite.
    Also invoked the configured hook against the project's full passing suite; it returned `{}`.
    All 166 unit tests, lint, type checking, and `npm run build:webpack` pass. Normal and elevated builds
    hit the existing cache cleanup EPERM; fresh `.next/stop-hook-verification-20261027` output passed.
    Restored temporary Next.js/TypeScript configuration exactly. Automatic execution still requires
    Codex's normal review and trust of the new hook definition.

- [x] **Keep page-grid Save and Download in view.**
  - Deliverable: Keep the existing action row visible while editing Rotate PDF and Reorder & delete,
    without changing the page grid or its controls.
  - Done: Verify the row while editing the first and middle pages of a 12-page PDF, save and download,
    and check narrow and desktop layouts in both themes. Pass all four required checks.
  - Completion (2026-10-27): Made the existing workspace action row sticky only when a page-grid tool has
    a selected file. Preserved the page-grid component, card layout, controls, and download lifecycle.
    Production in-app browser checks used the 12-page report on Rotate PDF and Reorder & delete: first-
    and middle-page edits kept Save and Download visible, both tools saved and downloaded successfully,
    and subsequent edits cleared the old download. Checked the commented 489×695 layout, Rotate PDF at
    390×844, and both tools at 320×700 and 1280×720 in light/dark without horizontal overflow.
    All 162 tests, lint, type checking, and `npm run build:webpack` pass. Existing Next.js cache cleanup
    failed with EPERM, including an elevated retry; fresh `.next/sticky-actions-review-20261027` output
    passed. Stopped the local server and restored temporary configuration exactly. Deployment is pending.

- [ ] **Keep preview automation free of Vercel Toolbar requests.**
  - Deliverable: Opt out of Vercel's injected preview toolbar through its documented automation request header.
    Explain the same-page URL requests and retain every privacy audit and assertion unchanged.
  - Progress (2026-10-27): Added preview-only context-wide `x-vercel-skip-toolbar: 1` in Playwright config.
    Official Vercel docs confirm the opt-out. The toolbar's public feedback script issues body-free HEAD
    requests to `location.href` with `x-vercel-draft-status: 1`; these are correctly flagged by the merge
    audit's non-GET check. Saved PR #16 traces confirm empty bodies and HTTP 204 for the HEAD requests.
    The toolbar also issues a body-free `OPTIONS /` to inspect `x-robots-tag`, confirmed in its script and
    traces. The external login-validation POST and same-origin probes are prevented by
    skipping toolbar injection. No tests, listeners, assertions, or request allowlists were changed.
    All 162 Vitest tests, lint, type checking, and `npm run build:webpack` pass. The build used fresh
    `.next/toolbar-automation-20261027` output; temporary configuration was restored exactly.
    PR #16 CI must verify the complete suite on this change's preview before this task is checked off.

- [ ] **Fix page-grid dragging when scrolling moves the handle.**
  - Deliverable: The unchanged Reorder & delete visitor test moves page 4 before page 2 and completes its
    download, reset, keyboard, and privacy checks.
  - Progress (2026-10-27): Inspected the saved failure trace. The handle is pressed at y=404, then target
    scrolling shifts it before pointer movement; no native drag starts and the page order stays unchanged.
    The handle now captures the primary pointer on press and hit-tests the destination on release.
    It retains insertion markers, native-drag fallback, and the original keyboard controls. Added a unit
    regression for the captured-pointer path, including a drop on a target thumbnail. The existing browser
    test and all its assertions are unchanged. All 162 Vitest tests, lint, type checking, and
    `npm run build:webpack` pass. The build used fresh `.next/page-drag-fix-20261027` output and restored
    temporary config exactly. The focused browser test is blocked before navigation by macOS Mach-port
    permission denial (1100), including the outside-sandbox retry with fresh report directories.
    The first elevated retry also hit old Playwright artifact cleanup EPERM. Browser verification remains
    unfinished; no passing browser result is claimed. PR, CI, and Vercel preview review remain pending.

- [x] **Remove retained page content after navigation.**
  - Deliverable: Fix the site so all eleven unchanged header-menu visitor assertions find zero “Coming soon”
    badges on ready tool pages and exactly one on unfinished tool pages, including hidden DOM matches.
    Preserve same-page hash navigation and the shared header/theme.
  - Done: Reproduce the 8/9-count regression, verify all eleven real header flows in the in-app browser,
    and pass all four required checks. Do not weaken existing visitor assertions.
  - Completion (2026-10-27): Added a pathname-keyed content boundary above the router's retained Activities.
    Old page DOM and workspaces unmount when the path changes; same-page hash links retain local state.
    Without the fix, eleven new regression cases reproduce the exact 8/9 counts; with it, they pass.
    A twelfth case verifies same-page filter preservation. All 144 unit tests, lint, type checking,
    and `npm run build:webpack` pass. The build used `.next/navigation-fix-final`; restored the temporary
    `next.config.ts`, `tsconfig.json`, and `next-env.d.ts` changes exactly afterward.
    Production in-app browser checks used the unchanged page-wide exact-text locator for all eleven header
    flows: three counts of 0 and eight counts of 1, correct URLs/headings, and visible workspaces.
    Also checked tool-to-tool navigation, Back, and same-page hash/filter preservation; no console errors.
    All existing visitor tests after home discovery remain unchanged. The full Chromium runner was not
    used under the repository's no-Chrome rule, and the separate e2e task remains unfinished.

- [x] **Restyle the whole site to DESIGN.md in light and dark.**
  - Deliverable: Shared design tokens, local fonts, logo/favicon, header and mobile sheet, saved theme,
    spacious home with a real merge panel, filtered tool grid, truthful facts/FAQ, About, and all tool workspaces.
    Preserve real registry tools, fixed routes, filenames, preview/processing/recovery/download behavior.
    Replace decision 5's first-screen grid rule and its visitor test with scrollable discovery in both themes.
  - Done: All four required checks pass. Inspect desktop and 390×844 layouts in light/dark, navigation,
    filtering, theme persistence, and a working tool. No offline or unfinished-tool claims.
  - Completion (2026-10-27): Restyled Home, About, all eleven tool pages, shared shell, header/footer,
    and the 404 page. Added local fonts with licenses, light/dark tokens, saved/system theme, a mobile menu,
    registry filters/search, privacy facts/FAQ, and a real merge workspace in the hero. Updated decision 5,
    the requirements, and only the superseded home discovery cases in the existing visitor suite.
    All 126 existing unit tests remain unchanged and pass; six new interaction cases bring the total to 132.
    `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build:webpack` all pass.
    Production builds used `.next/design-complete-verification` after ordinary and elevated cache cleanup
    failed with the known EPERM. Restored `next.config.ts`, `tsconfig.json`, and `next-env.d.ts` exactly.
    In-app browser checks covered 1280×720, 1366×768, and 390×844 in light/dark; no horizontal overflow.
    Checked all eleven header routes, filters/search, mobile menu closing, saved theme, About, offline FAQ,
    and a real HTTP 404. Merged fixtures through the full tool and hero; verified the real output names,
    reset focus, and five reopened page labels in reversed file order. Split rendered twelve thumbnails,
    rejected a reversed range, recovered with valid ranges, and offered two separately named PDF downloads.
    Browser console inspection found no warnings or errors. Saved light/dark screenshots.
    Playwright discovers all 24 visitor cases; its Chromium suite was not run under the no-Chrome rule.
    The separate e2e task remains unfinished. PR, CI, and Vercel preview review remain pending.


- [x] **Integrate the Merge PDF and Split/Extract worktree branches.**
  - Completion (2026-10-27): Merged `codex/s11-merge-pdf` into `codex/s11-page-tools` first;
    resolved the final `codex/s11-split-extract` merge and left it uncommitted for review.
    Preserved merge ordering and the two-file minimum, single-file range tools, and all result downloads.
    Fixed duplicate error definitions, single-output typing, and tests that still treated Split as unfinished.
    All 126 unit tests, lint, type checking, and `npm run build:webpack` pass. A worker regression test
    merges labeled fixtures, splits the result into two and three pages, and extracts pages 2 and 4;
    pdf.js verifies the output text and order. Production HTTP checks confirm all three tool workspaces,
    their options and file limits, three ready tools on Home, an unfinished tool, and an unknown-tool 404.
    The normal build and elevated retry failed on an old cache's EPERM. A fresh output directory at
    `.next/page-tools-integration` passed; restored all three temporary configuration files exactly.
    Playwright discovers all 20 cases. Browser tests were not run; the existing e2e task remains unfinished.

- [x] **Skip duplicate files in the shared shell.**
  - Deliverable: Skip files with the same name and size and announce skipped names in the status line.
    Apply the same behavior to the file picker, dropped files, and repeats within one selection.
  - Done: The existing test passes unchanged, along with all four required checks.
  - Completion (2026-10-27): The shared selection handler checks exact name and byte size, skips repeats,
    and announces skipped names. Selecting only duplicates preserves the current result and error state.
    The original test is unchanged and passes. All 49 unit tests, lint, type checking, and the webpack build pass.
    The build used a fresh output directory under `.next` to avoid the known old-cache permission error;
    restored `next.config.ts`, `tsconfig.json`, and `next-env.d.ts` exactly afterward. No Git commands were run.

- [ ] **Add Chromium visitor tests and test pull requests on public Vercel previews.**
  - Deliverable: Playwright tests using `tests/fixtures`, a local production-server configuration, and a PR-only
    CI job that follows successful checks, waits for the exact head commit's Vercel deployment, and tests its URL.
  - Done: All required checks and the Chromium visitor tests pass against a local production build.
    Cover all tools in the scrollable grid in light and dark, all header tool links, twelve decoded report thumbnails, the not-built
    message with Download disabled, and the not-a-PDF message. Validate preview matching and CI configuration.
  - Progress (2026-10-27): Added 15 Chromium cases, production/preview configuration, fixture usage notes,
    report/trace retention, and the e2e job with read-only GitHub deployment access and no repository secrets.
    Ten new unit cases cover head-SHA matching, unrelated/production deployments, pending states, current
    status selection, failure/error/inactivity, missing URLs, timeout, and HTTPS validation.
    All 48 unit tests, lint, type checking, and `npm run build:webpack` pass in a clean temporary checkout copy,
    used because dependency installation in the original checkout hit old file permission errors.
    Playwright discovers all 15 cases. CI YAML parsing and dependency, SHA, URL, and permission checks pass.
    Browser execution is blocked before page navigation: macOS denies Chromium's Mach port registration,
    both inside the sandbox and on the elevated retry. No browser test passed; this task remains unfinished.
    The hosted preview job also needs verification on GitHub after the user pushes. No Git state was changed.
  - Retry (2026-10-27): Ran the checks in the original checkout with Playwright installed.
    All 48 unit tests, lint, type checking, and the webpack production build pass here.
    Old build-cache and test-report cleanup returned EPERM, so this run used fresh output directories
    under `.next`; restored `next.config.ts`, `tsconfig.json`, and `next-env.d.ts` exactly afterward.
    Requested execution outside the sandbox for the production build and Chromium test run.
    The production server started, but all 15 browser cases failed before navigation because Chromium's
    MachPortRendezvousServer registration was still denied (1100) in the agent execution environment.
    The e2e task remains unfinished. No staging, branch, commit, or push operations were performed.
  - Alert locator fix (2026-10-27): The PR run reported that the two shared-shell tests matched both
    the tool error and Next.js's route announcer. Confirmed the installed Next.js announcer adds
    `role="alert"` in an open shadow root attached outside the workspace.
    Scoped both error assertions and the processing status assertion to the named Merge PDF workspace.
    Exact message assertions and strict matching remain in place. Documented the scoping rule in the e2e README.
    All 48 unit tests, lint, type checking, and the webpack production build pass in this checkout.
    Used fresh build/report output under `.next` to avoid the known old-cache cleanup errors;
    restored the temporary configuration afterward. Requested an outside-sandbox Chromium run,
    but all 15 cases were blocked at browser startup by Mach port registration denial (1100).
    The fix awaits browser verification and this task remains unchecked. Git operations remain with the user.

- [x] **Make unit tests part of the required workflow.**
  - Deliverable: Require all four checks to pass in `AGENTS.md` and the shared done criteria.
    Run Vitest before the CI build and update the add-pdf-tool skill to use the shared fixtures.
  - Done: Run all four checks, validate the updated skill, and confirm CI runs tests before the build.
  - Completion (2026-10-27): All 38 Vitest tests, lint, and type checking pass in the checkout.
    The webpack production build passes in the clean temporary copy used for fixture-test verification,
    avoiding the original checkout's old cache permissions issue. The updated skill passes its validator.
    Parsed the CI workflow and confirmed unit tests run before the build and failures stop the job.

- [x] **Add fixture-based unit tests before implementing the PDF tools.**
  - Deliverable: Vitest setup, five fictional fixtures, and a script to regenerate them.
    Cover registry contracts, page counts, worker errors for damaged, locked, and renamed files,
    the current not-built behavior, and plain recovery copy for every error code.
  - Done: Regenerate the fixtures; run the tests, lint, type checking, and the webpack production build.
    Test application behavior without testing PDF-library internals. Add the tests to CI.
  - Completion (2026-10-27): Added five small fictional fixtures, a regeneration script, and 38 Vitest tests
    across four files. Tests cover fixed slugs and grouping, validation page counts, each fixture's worker
    outcome, progress, batch failure, concurrency, retry, cleanup, and all eight recovery messages.
    Regenerated fixtures and verified repeatable bytes for the four unencrypted files. Rendered the invoice
    and report; independently opened the encrypted invoice with its documented test password.
    All 38 tests, lint, and type checking pass locally. The webpack production build passes in a clean temporary
    copy installed with `npm ci`; the original checkout cannot remove an old `.next` cache due to EPERM.
    CI now runs `npm test`. PR, CI, and preview review remain required before merge.

- [x] **1. Replace the default favicon.**
  - Deliverable: A PDF page with a lock, using `teal-800`, `oklch(43.7% 0.078 188.216)`.
  - Done: The custom icon loads through Next.js icon metadata, and the default Next.js favicon is replaced.
    Inspect the browser tab and the icon at 16px and 32px; the page and lock remain legible.
    Use neutral colors for contrast without adding another accent.
    The live site's browser tab shows the new icon after the merge.
  - Progress (2026-10-27): Removed the default `src/app/favicon.ico` and added `src/app/icon.svg` as the only icon,
    per the requested SVG-only setup. It uses teal-800 (`#115e59` in sRGB) with a white page fold and lock.
    Inspected the rendered icon at 16px and 32px. Confirmed Next.js emits only the SVG icon link,
    the icon URL returns HTTP 200 with the correct content type, and the served file matches the source asset.
    Lint, type checking, and the webpack production build pass.
    Completion (2026-10-27): User confirmed that the live-site check passed after merge.

- [x] **2. Give every tool its own registry-driven page.**
  - Deliverable: A stable URL for each registry entry, linked from its home-page card.
    Use explicit, fixed slugs from the registry for URLs; never derive addresses from display names.
    Derive page names and descriptions from the registry. See decision 4.
  - Done: All eleven links open the corresponding page with its exact registry name, description, and "Coming soon".
    Direct navigation and refresh work on each URL. Unknown tool paths return a 404.
    No file-processing controls are presented as functional yet.
  - Progress (2026-10-27): Added eleven fixed slugs and `/tools/<slug>` pages, linked from the home-page cards.
    Names, descriptions, groups, page metadata, and static route generation use the registry.
    All pages remain "Coming soon" without processing controls. Unknown tool paths return HTTP 404.
    Lint, type checking, and the webpack production build pass. Local production checks covered all eleven
    card clicks, direct requests, refreshes, registry content, and six invalid paths.
    An in-memory display-name change preserved the original URL, home-page link, page content, and metadata.
    Inspected the styled page in the existing development server.
    Completion (2026-10-27): [PR #8](https://github.com/laxmimerit/NoUploadPDF/pull/8) passed CI and Vercel checks.
    Reviewed all eleven card links, exact names and descriptions, "Coming soon" states, and refreshes on the
    Vercel preview. An unknown tool URL showed the 404 page. Task 2's done criteria pass.

- [x] **3. Make the home page clear in the first screen and add shared navigation.**
  - Superseded (2026-10-27): Decision 5 now follows `DESIGN.md`. The home page may scroll; the old
    first-screen fit criteria below record the original task only. See the restyle task for current criteria.
  - Depends on: Task 2.
  - Deliverable: A compact introduction explaining free, browser-only PDF tools with no uploads, with every
    registry tool visible and directly linked in a laptop's initial viewport without scrolling. Keep the grid
    grouped and the introduction to a short headline and one supporting line. Put the logo and name on the left
    of the shared header, followed by one dropdown per group and About. Derive groups and tools from the registry,
    never a separate list. Add `/about` with truthful purpose, privacy, and current-availability copy. See decision 5.
  - Done: Check desktop and narrow-screen layouts and record the tested viewport sizes. On a fresh home-page
    load on a laptop, the purpose and all eleven tool links are visible without scrolling. Narrow screens may
    scroll vertically but must keep navigation and links usable without horizontal overflow.
    Every tool link opens its fixed
    registry URL. On the home page, every tool page, and About, the top menu contains all four group dropdowns
    with the correct tool links and a working About link. Dropdowns work with keyboard, pointer, and touch;
    keyboard users can open and close them and follow links. Unfinished tools retain "Coming soon".
  - Completion (2026-10-27): Added the shared header, compact grouped grid, and short About page.
    Groups and tools come from the registry, and About explicitly says processing is not available yet.
    In-app browser checks covered all eleven home-grid and dropdown links, the header on every tool page,
    About links from every tool page, and keyboard opening, traversal, Escape, and focus return for each group.
    All eleven tools fit without scrolling at 1366×768 and 1280×720. Checked narrow layouts at 390×844 and
    320×700; all dropdowns stay within the viewport, links remain usable, and there is no horizontal overflow.
    Lint, type checking, and the webpack production build pass. Browser console checks found no warnings or errors.
    Replaced the Turbopack-only Tailwind loader with PostCSS so webpack builds include utility styles.
    Local builds used a temporary fresh output directory under `.next` because existing output cleanup returned
    EPERM; restored the normal output configuration afterward. PR, CI, and preview review remain required before merge.

- [x] **4. Build the shared tool shell.**
  - Depends on: Tasks 2–3.
  - Deliverable: Reusable file selection, tool options, processing state, progress, error, download, and reset UI.
    Provide an interface for connecting tool operations without duplicating the shell.
  - Done: A controlled local fixture exercises each state, including retry after error and reset after success.
    Keyboard navigation reaches all controls, status and errors are accessible, and the layout works on narrow screens.
    Incomplete tools keep their "Coming soon" state; fixture behavior is not shipped as a working PDF tool.
  - Completion (2026-10-27): All eleven tool pages use the shared client shell. PDF selection by file button
    and drop events feeds a file list with name, size, page count, and a pdf.js thumbnail for every page.
    The shell exposes options and engine interfaces, accessible progress and recovery errors, a result download,
    and reset. All tools remain "Coming soon" and real jobs report that the tool is not built yet.
    A temporary local fixture exercised processing, success, download, error retry, reset after success,
    cancellation, and unmount. Reopened the downloaded three-page fixture and checked its page count and previews.
    Keyboard checks covered file selection, control traversal, retry, reset, and focus return to file selection.
    Checked desktop and narrow layouts at 1280×720, 390×844, and 320×700 without horizontal overflow.
    Temporary fixture routes, operations, and diagnostic controls were removed; no test setup was added.
    Lint, type checking, and the webpack production build pass. Existing output-directory cleanup returned EPERM,
    so local production builds used fresh temporary directories under `.next`; normal configuration was restored.
    PR, CI, and Vercel preview review remain required before merge.

- [x] **5. Build the shared Web Worker engine foundation.**
  - Depends on: Task 4.
  - Deliverable: A browser-only engine with job execution, result/error messages, buffer handling, and cleanup.
    Choose a worker-compatible PDF library and document the choice and its costs in a decision record.
  - Done: A minimal local PDF fixture exercises a worker job and returns a readable result through the shell interface.
    A failed job reports an error and permits retry. Reset or unmount cleans up resources and ignores stale results.
    The main thread remains interactive during work, and file contents produce no network requests.
    The engine follows its AGENTS.md rules; unfinished tools remain "Coming soon".
  - Completion (2026-10-27): Added typed jobs with IDs, tool slugs, files, and options; progress, result, and
    error replies; one-job guards in both client and worker; transferable buffers; and cleanup on reset/unmount.
    The shell retains browser File objects for preview and retry, and transfers fresh buffers to the engine.
    Added `@cantoo/pdf-lib` for worker validation and future changes, and pdf.js for local previews. Decision 6
    records the choice, including the original pdf-lib's lack of releases since 2021, and the memory/bundle costs.
    Non-PDF, damaged, password-protected, and not-built errors explain the next action. Direct worker fixtures
    also covered encrypted object streams that fail strict parsing before encryption detection.
    The temporary worker fixture returned a readable three-page PDF through the shell. Its diagnostic interface
    confirmed detached transferred buffers, concurrent-job rejection, a responsive main thread, released object
    URLs, and no stale result after cancellation/unmount. Observed requests were app assets and route reads;
    no document contents were transmitted. The engine contains no DOM, React, window, fetch, or analytics code.
    The successful fixture operation was removed, leaving the operation registry empty as requested.
    Lint, type checking, and the webpack production build pass. No test runner or persistent test fixtures were added.
    PR, CI, and Vercel preview review remain required before merge.

- [x] **6. Implement Merge PDF.**
  - Depends on: Tasks 4–5.
  - Deliverable: Combine selected PDFs in the visitor's chosen file order.
  - Done: Merge labeled two-page and three-page fixtures; output has five pages in the chosen order.
    Reverse the file order and verify the output changes accordingly. Apply the shared tool done criteria.
  - Progress (2026-10-27): Installed dependencies with `npm ci`. Added the worker operation, registry availability,
    a two-file minimum, keyboard-accessible Move up/down controls, and first-file naming (`report-merged.pdf`).
    Selection/order changes clear old downloads. Damaged-file errors allow removal, replacement, and retry.
    Added two fictional labeled fixtures and reopened merge output with pdf.js: five matching pages in both
    file orders. Tests cover output names, invalid options, too few files, worker success and cleanup,
    broken input, recovery, fresh retry buffers, cancellation, stale replies, and reset focus.
    All 80 unit tests, lint, type checking, and `npm run build:webpack` pass.
    The normal build and elevated retry hit EPERM while removing `.next/types`; a fresh output directory at
    `.next/merge-verification` passed. Restored `next.config.ts`, `tsconfig.json`, and `next-env.d.ts` exactly.
    Playwright discovers 18 visitor cases, including three new merge cases; the automated Chromium suite
    has not been executed and its separate task remains unchecked.
  - Completion (2026-10-27): With the user's explicit permission, used only Computer Use's in-app browser
    controls against the production build. Downloaded and independently reopened the five-page output in both
    selected and reversed file order; all visible page labels match. Checked the `report-merged.pdf` name,
    damaged-file removal and valid retry without reload, non-PDF and password-protected errors, processing
    controls/progress, download invalidation after reordering, keyboard activation, and reset focus.
    Checked desktop and narrow layout (browser-reported narrow viewport 354×767), with no horizontal overflow.
    The request audit during selection, processing, and download recorded only GET requests for app assets
    and route reads, all with empty bodies. Downloads used local blob URLs. Valid merging produced no console
    warnings or errors. Saved success and narrow error screenshots. Stopped the temporary verification servers
    and restored configuration and the browser viewport. A final rerun passed all 80 tests, lint, type checking,
    and the webpack build (fresh output `.next/merge-final-verification`; temporary configuration restored).
    PR, CI, and Vercel preview review remain required before merge.

- [x] **7. Implement Split PDF.**
  - Depends on: Tasks 4–5.
  - Deliverable: Split a PDF into separate PDFs using chosen page ranges.
  - Done: Split a labeled five-page fixture at ranges 1–2 and 3–5; outputs contain two and three matching pages.
    Reject reversed and out-of-range boundaries. Apply the shared tool done criteria.
  - Completion (2026-10-27): Added one local worker operation, shared range validation, single-file options,
    and separate PDF download links. Downloaded and reopened the five-page fixture split at `1-2, 3-5`;
    pdf.js read the matching two and three page labels. Also downloaded `1-3, 7, 10-12` from the report
    and verified all three files' text and page order. Browser checks covered zero/reversed ranges,
    correction and retry, processing, downloads, keyboard reset, and 320×700 layout without overflow.
    The browser resource inventory showed only local app assets and route reads; processing code contains
    no network calls. All 110 unit tests, lint, type checking, and the webpack build pass.
    A fresh build directory under `.next` resolved the old output cleanup EPERM, which also occurred on
    an outside-sandbox retry; restored `next.config.ts`, `tsconfig.json`, and `next-env.d.ts` afterward.
    Home cards still fit at 1280×720 and 1366×768. PR, CI, and Vercel preview review remain pending.

- [x] **8. Implement Extract pages.**
  - Depends on: Tasks 4–5.
  - Deliverable: Save selected pages as one new PDF.
  - Done: Extract pages 2 and 4 from a labeled five-page fixture; output contains exactly those pages in source order.
    Reject empty and out-of-range selections. Apply the shared tool done criteria.
  - Completion (2026-10-27): Added the extraction worker operation and shared range options.
    Downloaded `4, 2, 2` from the five-page fixture and reopened it with pdf.js: exactly pages 2 and 4,
    in source order, with original text intact. Unit tests also verify `1-3, 7, 10-12`, repeated/overlapping
    pages, empty/malformed/reversed/out-of-range selections, one-page PDFs, and unsupported inputs.
    In-app browser checks covered damaged/non-PDF errors, replacing the file and successfully retrying
    without reload, keyboard processing, reset, option-change cleanup, and the 320×700 layout.
    The checks and build-directory workaround recorded for task 7 also pass for this implementation.
    Added two Playwright visitor cases and updated availability assertions; all 17 cases are discovered.
    The standalone Chromium suite was not run: page checks used the skill-required in-app browser.
    The existing Chromium e2e task stays unfinished. PR, CI, and Vercel preview review remain pending.

- [ ] **9. Implement Rotate PDF.**
  - Depends on: Tasks 4–5.
  - Deliverable: Rotate selected pages in quarter turns.
  - Done: Rotate one page of a mixed-orientation fixture by 90 degrees; verify its orientation.
    Other pages remain unchanged.
    Verify 180- and 270-degree rotations and unchanged page count. Apply the shared tool done criteria.

  - Progress (2026-10-27): Added the shared themed page grid, individual and all-page turns, a single-file
    registry configuration, Save rotated PDF, and source-based `-rotated.pdf` naming. The worker validates
    page plans and adds turns to existing page rotation. The four-page fictional fixture starts at
    0/90/180/270 degrees. Reopened unit-test results preserve page count, dimensions, visible text, and
    unedited rotations after 90/180/270-degree turns. Interaction tests cover repeated turns, reset,
    button-based result invalidation, error retry with fresh buffers, processing locks, cancellation,
    stale results, URL cleanup, and reset focus. Browser visual, download, narrow-layout, and network
    checks remain pending, so this task stays unfinished. All 161 Vitest tests, lint, type checking, and
    `npm run build:webpack` pass. The normal build and elevated retry hit the existing cache EPERM;
    fresh `.next/page-grid-checked-20261027` output passed and temporary configuration was restored.
    Production HTTP checks confirm both tool pages, their own save buttons, single-file selection,
    five available home cards, six unfinished cards, and unknown-tool 404. Playwright discovers 26 cases;
    browser cases were not run because this task permits only the in-app browser, whose open requests
    were queued without inspection access. PR, CI, and Vercel preview review are also pending.

- [ ] **10. Implement Reorder & delete.**
  - Depends on: Tasks 4–5.
  - Deliverable: Rearrange pages and remove unwanted pages before saving.
  - Done: From a labeled four-page fixture, reorder to 4, 2, 1 and delete page 3.
    Reopened output has exactly three pages in that order. Prevent deleting every page.
    Apply the shared tool done criteria.

  - Progress (2026-10-27): Uses the same page grid with drag insertion, visible Earlier/Later controls,
    Alt + arrows, Delete, individual turns, and edit reset. Focus follows moves and deletions.
    Both grid and worker prevent removing every page. Reopened unit-test output has exactly pages 4, 2, 1,
    their original visible content, and additive turns. Downloads use the source base name plus `-reordered.pdf`.
    Added real-worker visitor cases for both tools and moved the unfinished-tool test to Compress PDF.
    Browser visual, download, narrow-layout, and network checks remain pending, so this task stays unfinished.
    The checks and build workaround recorded for task 9 also pass for this implementation.
    PR, CI, and Vercel preview review are also pending.

- [x] **11. Implement Images to PDF.**
  - Depends on: Tasks 4–5.
  - Deliverable: Combine supported photos or images into one PDF in the chosen order, without OCR.
  - Done: Convert three labeled JPEG/PNG photos, including portrait and landscape images.
    Output has three readable pages in the selected order with no stretching or unintended cropping.
    Reordering photos changes the output order. Apply the shared tool done criteria.
  - Progress (2026-10-28): Added JPEG/PNG selection, local previews, ordering and a worker operation.
    Focused tests reopen three mixed-orientation image pages, render their colors and check the selected order;
    invalid image data is rejected. Shared-shell tests also cover invalid image recovery, ordering, download
    invalidation, and reset. The converter is available. As directed for this task, browser, lint, and build
    checks run in CI; those checks have not been verified locally. Focused unit tests and type checking pass.

- [x] **12. Implement PDF to images.**
  - Depends on: Tasks 4–5.
  - Deliverable: Export selected PDF pages as downloadable image files.
  - Done: Export all pages of a three-page fixture and get three readable images with identifiable page filenames.
    Export only page 2 and get one image matching that page. Apply the shared tool done criteria.
  - Progress (2026-10-28): Added selected-page PNG rendering in the worker, a PDF-named ZIP for multiple pages,
    and a single PNG for one page. Focused tests inspect ZIP entries, decode the selected image and reject invalid
    ranges. A PDF text rendering test passes, but Node reports its standard-font asset unavailable and falls back;
    browser font fidelity remains unverified. Shared-shell tests also cover range correction, download, and reset.
    Browser download, interaction
    and network checks run in CI, as directed for this task, and have not been verified locally.
    Focused unit tests and type checking pass. Both converters have a new CI visitor test.

- [x] **13. Implement Page numbers.**
  - Depends on: Tasks 4–5.
  - Deliverable: Add sequential page numbers at a chosen position and starting number.
  - Done: Number a three-page fixture starting at 5; reopened pages show 5, 6, and 7 at the selected position.
    Check portrait and landscape pages for clipping and retain the original page count and content.
    Apply the shared tool done criteria.

  - Completion (2026-10-27): Added a single-file local worker operation and options for bottom centre,
    bottom right, or top right, with any safe whole-number start (including zero and negatives).
    Downloaded the fictional three-page mixed portrait/landscape/cropped fixture starting at 5 and reopened
    it with pdf.js: labels 5, 6, 7, the correct position, original content, and unchanged page count.
    Downloaded top-right numbering starting at -1 and verified -1, 0, 1; checked bottom-right output too.
    Unit tests independently check all positions through existing 0/90/180/270-degree rotations and crop offsets.
    Browser checks covered fractional-start errors, correction/retry, damaged-file replacement, keyboard saving,
    processing locks, option-change download invalidation, reset focus, and 320px light/dark layouts.
    The read-only review found a safe-integer boundary error; corrected the guard and added two regressions.
    A temporary local browser audit recorded only local GET requests with empty bodies during selection,
    processing, and download. No document data was transmitted; removed the audit afterward.
    All 205 Vitest tests, lint, type checking, and `npm run build:webpack` pass. The existing Next output
    cleanup EPERM occurred on normal and elevated attempts; fresh `.next/number-watermark-complete-20261027`
    output passed. Restored temporary Next/TypeScript configuration exactly. Added a Playwright visitor case;
    all 28 cases are discovered, but the standalone Chromium suite was not run under the in-app-browser-only
    instruction. The separate e2e task remains unfinished. PR, CI, and Vercel preview review remain pending.

- [x] **14. Implement Watermark PDF.**
  - Depends on: Tasks 4–5.
  - Deliverable: Place a text watermark on selected pages with a placement preview.
  - Done: Apply a known watermark to selected pages of a mixed-orientation fixture.
    Reopened output matches the preview placement; unselected pages remain unchanged and content stays readable.
    Apply the shared tool done criteria.

  - Completion (2026-10-27): Added a single-file text watermark operation, selected page ranges, centre or
    diagonal placement, 5–50% opacity, and a local placement preview generated by the export worker operation.
    Downloaded centre and diagonal watermarks on pages 1 and 3 of the mixed-orientation fixture and reopened
    both with pdf.js. Text and placement match the preview; page 2 remains unchanged and source text remains.
    Tests cover crop/rotation placement, opacity, repeated ranges, unsupported text/options, worker recovery,
    fresh retry buffers, debounce, cancellation, stale results, URL cleanup, and processing locks.
    Browser checks covered invalid ranges, unsupported characters, non-PDF input, valid retry, keyboard save,
    local downloads, option-change cleanup, reset, and 320px/1280px layouts in light/dark themes.
    Browser verification caught duplicate previews after saving. Fixed render-generation thumbnail batches
    and cached unchanged completed previews; three regression tests fail before the fix and pass after it.
    The third subagent reviewed without editing and found no further issues after fixes. Rechecked the final
    production build in the in-app browser: exactly one preview per page after saving, with no horizontal overflow.
    The local network audit, 205 tests, lint, type checking, webpack build, and build-directory workaround
    recorded for task 13 also apply. No audit code or temporary configuration remains. Added one visitor case;
    standalone Chromium execution, PR CI, and Vercel preview review remain pending as recorded above.

- [ ] **15. Implement Sign PDF.**
  - Depends on: Tasks 4–5.
  - Deliverable: Add a visible signature and place and size it on a selected page.
  - Done: Sign a multi-page form; reopened output has the signature on the chosen page at the previewed position
    and size, while form content and other pages remain intact. Explain that this is a visible signature.
    Apply the shared tool done criteria.
  - [x] Typed signature addition (2026-10-27): Added a typed-name input and a locally served Sacramento
    handwriting font with its license. Text renders to a transparent PNG after the font loads, then uses
    the existing placement/export flow. Added explicit visible-signature versus digital-signature copy.
    Drawing, upload, and placement logic are unchanged. All 40 focused Sign PDF tests, lint, type checking,
    and the webpack build pass. The normal and elevated builds hit the existing cache-cleanup EPERM;
    fresh `.next/typed-signature-20261027` output passed, and temporary configuration was restored exactly.
    Production in-app browser checks typed and saved a fictional signature. The downloaded report reopens
    with pdf.js: 12 pages, all source text preserved, and one added signature image only on page 1.
    Checked 390px light and 320px dark layouts without horizontal overflow and verified the served font
    matches the bundled file. Task 15's broader done criteria remain pending; its parent stays unchecked.
  - [x] Review and fix Sign PDF (2026-10-27): Invoked the named `pdf_reviewer` in its read-only role.
    Fixed hidden-field exposure, changed saved-appearance geometry, signature layering, and saving before
    selected-page placement is ready. Follow-up reviews also caught mixed annotation order, print-only
    widgets, stale saved appearances under `NeedAppearances`, and the ambiguous Invisible flag.
    Form widgets now become fixed Stamp appearances in their original annotation positions; the new
    printable signature comes last. Unsupported appearances show correction advice. Save readiness matches
    the exact current signature and placement options. The reviewer confirmed the preservation findings
    were addressed; corrected its final copy finding about the still-usable, verification-pending editor.
    All 105 related tests across nine files pass, including 50 focused Sign tests that reopen and render
    outputs with pdf.js. Lint, type checking, and the webpack build pass. Normal and elevated builds hit
    the existing cache-cleanup EPERM; fresh `.next/sign-review-final-20261027` output passed, and temporary
    Next.js/TypeScript configuration was restored exactly. No new browser or network check was run.
    Sign PDF retains Coming soon with truthful verification-pending copy. Task 15 remains unfinished until
    its broader browser, downloaded-output and privacy criteria pass.

- [x] **16. Implement Compress PDF.**
  - Depends on: Tasks 4–5.
  - Deliverable: Attempt local file-size reduction and report original and resulting byte sizes honestly.
  - Done: A compressible fixture produces a smaller readable PDF with the same page count and order.
    Inspect text and images in reopened output for unacceptable quality loss.
    An already optimized fixture reports no reduction when appropriate; never claim savings for a larger result.
    Apply the shared tool done criteria.
  - Local completion (2026-10-28): Added Clean up mode with original and resulting byte sizes and an
    unchanged-original fallback, including for signed PDFs. Focused tests reopen smaller results, check page
    text, order, geometry and image data, test errors and retries, and cover download and reset. Seven focused
    test files (56 tests) and type checking pass. Browser, privacy network, lint and production build checks
    are deferred to CI under the current project instructions. PR and Vercel preview review remain pending.
    Scan enhancement (2026-10-28): Added two local image quality settings, a warning about loss of selectable
    text and interactive content, and the original-file fallback. Focused tests use a fictional two-page scan,
    reopen outputs, check page order and dimensions, and exercise the worker and controls. Browser, privacy
    network, lint, production build, PR CI, and Vercel preview checks are pending under the project instructions.
