# NoUploadPDF tasks

Use the [requirements](requirements.md) and [decisions](decisions.md) at the start of each task.
Each numbered task is intended for one chat. All tasks below are planned and unchecked.
Tick a task off only when its done criteria pass, and report the checks performed.

## Shared done criteria

For every implementation task, run `npm run lint`, `npm run typecheck`, and `npm run build:webpack`.
Use the pull request, CI, and Vercel preview workflow from decision 3.
Read the relevant installed Next.js guide before writing framework code.

For every tool task (5–15), also:

- Use the shared shell and worker engine, with one operation per engine source file.
- Reopen downloaded output and check the task's observable results with small, known fixtures.
- Check unsupported or corrupt input and invalid options; show a useful error and allow a valid retry without reload.
- Check processing, error, download, and reset states, including keyboard access.
- Inspect browser network activity while selecting files, processing, and downloading.
  Confirm no file contents, derived images, or signatures are transmitted.
- Remove "Coming soon" for that tool only when its done criteria pass; keep other unfinished tools marked.

## Checklist

- [ ] **1. Replace the default favicon.**
  - Deliverable: A PDF page with a lock, using `teal-800`, `oklch(43.7% 0.078 188.216)`.
  - Done: The custom icon loads through Next.js icon metadata, and the default Next.js favicon is replaced.
    Inspect the browser tab and the icon at 16px and 32px; the page and lock remain legible.
    Use neutral colors for contrast without adding another accent.
    The live site's browser tab shows the new icon after the merge.

- [ ] **2. Give every tool its own registry-driven page.**
  - Deliverable: A stable URL for each registry entry, linked from its home-page card.
    Extend the registry with route identifiers as needed; derive page names and descriptions from it.
  - Done: All eleven links open the corresponding page with its exact registry name, description, and "Coming soon".
    Direct navigation and refresh work on each URL. Unknown tool paths return a 404.
    No file-processing controls are presented as functional yet.

- [ ] **3. Build the shared tool shell.**
  - Depends on: Task 2.
  - Deliverable: Reusable file selection, tool options, processing state, progress, error, download, and reset UI.
    Provide an interface for connecting tool operations without duplicating the shell.
  - Done: A controlled local fixture exercises each state, including retry after error and reset after success.
    Keyboard navigation reaches all controls, status and errors are accessible, and the layout works on narrow screens.
    Incomplete tools keep their "Coming soon" state; fixture behavior is not shipped as a working PDF tool.

- [ ] **4. Build the shared Web Worker engine foundation.**
  - Depends on: Task 3.
  - Deliverable: A browser-only engine with job execution, result/error messages, buffer handling, and cleanup.
    Choose a worker-compatible PDF library and document the choice and its costs in a decision record.
  - Done: A minimal local PDF fixture exercises a worker job and returns a readable result through the shell interface.
    A failed job reports an error and permits retry. Reset or unmount cleans up resources and ignores stale results.
    The main thread remains interactive during work, and file contents produce no network requests.
    The engine follows its AGENTS.md rules; unfinished tools remain "Coming soon".

- [ ] **5. Implement Merge PDF.**
  - Depends on: Tasks 3–4.
  - Deliverable: Combine selected PDFs in the visitor's chosen file order.
  - Done: Merge labeled two-page and three-page fixtures; output has five pages in the chosen order.
    Reverse the file order and verify the output changes accordingly. Apply the shared tool done criteria.

- [ ] **6. Implement Split PDF.**
  - Depends on: Tasks 3–4.
  - Deliverable: Split a PDF into separate PDFs using chosen page ranges.
  - Done: Split a labeled five-page fixture at ranges 1–2 and 3–5; outputs contain two and three matching pages.
    Reject reversed and out-of-range boundaries. Apply the shared tool done criteria.

- [ ] **7. Implement Extract pages.**
  - Depends on: Tasks 3–4.
  - Deliverable: Save selected pages as one new PDF.
  - Done: Extract pages 2 and 4 from a labeled five-page fixture; output contains exactly those pages in source order.
    Reject empty and out-of-range selections. Apply the shared tool done criteria.

- [ ] **8. Implement Rotate PDF.**
  - Depends on: Tasks 3–4.
  - Deliverable: Rotate selected pages in quarter turns.
  - Done: Rotate one page of a mixed-orientation fixture by 90 degrees; verify its orientation.
    Other pages remain unchanged.
    Verify 180- and 270-degree rotations and unchanged page count. Apply the shared tool done criteria.

- [ ] **9. Implement Reorder & delete.**
  - Depends on: Tasks 3–4.
  - Deliverable: Rearrange pages and remove unwanted pages before saving.
  - Done: From a labeled four-page fixture, reorder to 4, 2, 1 and delete page 3.
    Reopened output has exactly three pages in that order. Prevent deleting every page.
    Apply the shared tool done criteria.

- [ ] **10. Implement Images to PDF.**
  - Depends on: Tasks 3–4.
  - Deliverable: Combine supported photos or images into one PDF in the chosen order, without OCR.
  - Done: Convert three labeled JPEG/PNG photos, including portrait and landscape images.
    Output has three readable pages in the selected order with no stretching or unintended cropping.
    Reordering photos changes the output order. Apply the shared tool done criteria.

- [ ] **11. Implement PDF to images.**
  - Depends on: Tasks 3–4.
  - Deliverable: Export selected PDF pages as downloadable image files.
  - Done: Export all pages of a three-page fixture and get three readable images with identifiable page filenames.
    Export only page 2 and get one image matching that page. Apply the shared tool done criteria.

- [ ] **12. Implement Page numbers.**
  - Depends on: Tasks 3–4.
  - Deliverable: Add sequential page numbers at a chosen position and starting number.
  - Done: Number a three-page fixture starting at 5; reopened pages show 5, 6, and 7 at the selected position.
    Check portrait and landscape pages for clipping and retain the original page count and content.
    Apply the shared tool done criteria.

- [ ] **13. Implement Watermark PDF.**
  - Depends on: Tasks 3–4.
  - Deliverable: Place a text watermark on selected pages with a placement preview.
  - Done: Apply a known watermark to selected pages of a mixed-orientation fixture.
    Reopened output matches the preview placement; unselected pages remain unchanged and content stays readable.
    Apply the shared tool done criteria.

- [ ] **14. Implement Sign PDF.**
  - Depends on: Tasks 3–4.
  - Deliverable: Add a visible signature and place and size it on a selected page.
  - Done: Sign a multi-page form; reopened output has the signature on the chosen page at the previewed position
    and size, while form content and other pages remain intact. Explain that this is a visible signature.
    Apply the shared tool done criteria.

- [ ] **15. Implement Compress PDF.**
  - Depends on: Tasks 3–4.
  - Deliverable: Attempt local file-size reduction and report original and resulting byte sizes honestly.
  - Done: A compressible fixture produces a smaller readable PDF with the same page count and order.
    Inspect text and images in reopened output for unacceptable quality loss.
    An already optimized fixture reports no reduction when appropriate; never claim savings for a larger result.
    Apply the shared tool done criteria.
