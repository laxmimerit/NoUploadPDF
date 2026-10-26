# NoUploadPDF tasks

Use the [requirements](requirements.md) and [decisions](decisions.md) at the start of each task.
Each numbered task is intended for one chat. Unchecked tasks may have work awaiting final verification.
Tick a task off only when its done criteria pass, and report the checks performed.

## Shared done criteria

For every implementation task, run `npm run lint`, `npm run typecheck`, and `npm run build:webpack`.
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

- [ ] **6. Implement Merge PDF.**
  - Depends on: Tasks 4–5.
  - Deliverable: Combine selected PDFs in the visitor's chosen file order.
  - Done: Merge labeled two-page and three-page fixtures; output has five pages in the chosen order.
    Reverse the file order and verify the output changes accordingly. Apply the shared tool done criteria.

- [ ] **7. Implement Split PDF.**
  - Depends on: Tasks 4–5.
  - Deliverable: Split a PDF into separate PDFs using chosen page ranges.
  - Done: Split a labeled five-page fixture at ranges 1–2 and 3–5; outputs contain two and three matching pages.
    Reject reversed and out-of-range boundaries. Apply the shared tool done criteria.

- [ ] **8. Implement Extract pages.**
  - Depends on: Tasks 4–5.
  - Deliverable: Save selected pages as one new PDF.
  - Done: Extract pages 2 and 4 from a labeled five-page fixture; output contains exactly those pages in source order.
    Reject empty and out-of-range selections. Apply the shared tool done criteria.

- [ ] **9. Implement Rotate PDF.**
  - Depends on: Tasks 4–5.
  - Deliverable: Rotate selected pages in quarter turns.
  - Done: Rotate one page of a mixed-orientation fixture by 90 degrees; verify its orientation.
    Other pages remain unchanged.
    Verify 180- and 270-degree rotations and unchanged page count. Apply the shared tool done criteria.

- [ ] **10. Implement Reorder & delete.**
  - Depends on: Tasks 4–5.
  - Deliverable: Rearrange pages and remove unwanted pages before saving.
  - Done: From a labeled four-page fixture, reorder to 4, 2, 1 and delete page 3.
    Reopened output has exactly three pages in that order. Prevent deleting every page.
    Apply the shared tool done criteria.

- [ ] **11. Implement Images to PDF.**
  - Depends on: Tasks 4–5.
  - Deliverable: Combine supported photos or images into one PDF in the chosen order, without OCR.
  - Done: Convert three labeled JPEG/PNG photos, including portrait and landscape images.
    Output has three readable pages in the selected order with no stretching or unintended cropping.
    Reordering photos changes the output order. Apply the shared tool done criteria.

- [ ] **12. Implement PDF to images.**
  - Depends on: Tasks 4–5.
  - Deliverable: Export selected PDF pages as downloadable image files.
  - Done: Export all pages of a three-page fixture and get three readable images with identifiable page filenames.
    Export only page 2 and get one image matching that page. Apply the shared tool done criteria.

- [ ] **13. Implement Page numbers.**
  - Depends on: Tasks 4–5.
  - Deliverable: Add sequential page numbers at a chosen position and starting number.
  - Done: Number a three-page fixture starting at 5; reopened pages show 5, 6, and 7 at the selected position.
    Check portrait and landscape pages for clipping and retain the original page count and content.
    Apply the shared tool done criteria.

- [ ] **14. Implement Watermark PDF.**
  - Depends on: Tasks 4–5.
  - Deliverable: Place a text watermark on selected pages with a placement preview.
  - Done: Apply a known watermark to selected pages of a mixed-orientation fixture.
    Reopened output matches the preview placement; unselected pages remain unchanged and content stays readable.
    Apply the shared tool done criteria.

- [ ] **15. Implement Sign PDF.**
  - Depends on: Tasks 4–5.
  - Deliverable: Add a visible signature and place and size it on a selected page.
  - Done: Sign a multi-page form; reopened output has the signature on the chosen page at the previewed position
    and size, while form content and other pages remain intact. Explain that this is a visible signature.
    Apply the shared tool done criteria.

- [ ] **16. Implement Compress PDF.**
  - Depends on: Tasks 4–5.
  - Deliverable: Attempt local file-size reduction and report original and resulting byte sizes honestly.
  - Done: A compressible fixture produces a smaller readable PDF with the same page count and order.
    Inspect text and images in reopened output for unacceptable quality loss.
    An already optimized fixture reports no reduction when appropriate; never claim savings for a larger result.
    Apply the shared tool done criteria.
