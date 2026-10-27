# NoUploadPDF requirements

## Product promise

NoUploadPDF provides free, simple PDF tools. Files never leave the visitor's browser.
Visitors choose files, process them on their device, and download the result without an account or sign-up.

Read this PRD with the [decisions](decisions.md) and [task checklist](tasks.md).

## Current state

The home page links to eleven tool pages using fixed slugs from `src/lib/tools.ts`.
Each page shows its registry name and description. Merge PDF, Split PDF, and Extract pages are implemented;
the other eight tools remain marked "Coming soon" and report that processing is not built yet.
Merge PDF combines two or more files in the displayed order, with Move up and Move down controls.
The result uses the first file's name, such as `report-merged.pdf`.
Split PDF and Extract pages accept one PDF and page ranges such as `1-3, 7, 10-12`.
Split creates a separate downloadable PDF for each comma-separated part, in the entered range order.
Extract creates one PDF in source order, saving repeated or overlapping pages only once.
Empty selections, zero, reversed ranges, malformed parts, and pages beyond the document are rejected;
the error identifies the incorrect part and explains how to correct it. All three tools run in the local worker.
All eleven pages share file selection, a file list with size and page count, local pdf.js page thumbnails,
options, progress, errors, download handling, and reset. Damaged, locked, and non-PDF files show recovery messages.
Jobs accept a tool, files, and options; results can contain one PDF or several PDFs.
Each output has its own download link and object URL. Changing options, files, or file order clears old results.
Reset and unmount release all result URLs. Download stays disabled until an operation supplies a result.
The home page follows `DESIGN.md` with a spacious hero, working merge panel, and searchable tool grid.
A shared header on every page contains
the logo and name on the left, registry-driven tool-group dropdowns, and an About link.
About explains local previews, browser-only processing, the three available tools, and the unfinished tools.
The shared logo and only favicon (`src/app/icon.svg`) use the design’s Locked page geometry.
Light and dark themes share layout and privacy green; a saved choice overrides the system preference.
Fonts are hosted locally. The app does not support offline operation yet.
Vitest covers registry contracts, PDF validation and worker jobs, and recovery messages using fictional fixtures.
CI runs unit tests, lint, type checking, and a build.
Playwright is configured for Chromium visitor tests using the shared fixtures: scrollable tool discovery in both themes,
all header tool links, twelve report thumbnails, the not-built state on Rotate PDF, non-PDF input,
five-page merge downloads in both file orders, damaged-file recovery, reset, keyboard ordering, narrow layout,
network checks during merging, and both range tools' retry/download/reset flows.
The browser cases await execution; the merge flows passed manual in-app browser checks on the source branch
against a local production build, including reopened downloads in both orders, damaged-file recovery,
protection errors, keyboard controls, reset, and narrow layout.
On pull requests, a new e2e job follows successful checks and waits for the PR head commit's public Vercel
preview through GitHub deployment statuses. Local browser execution is not yet verified: macOS denied Chromium
startup on 2026-10-27, including the elevated retry. The e2e task remains unfinished until the tests pass.
Vercel preview integration was verified through PR #8 on 2026-10-27.
Branch protection remains unverified.

## Personas and success criteria

| Persona | Need | Success criteria |
| --- | --- | --- |
| Asha | Merge two bank statements for a loan. | Download one PDF with both statements in her chosen order. |
| Ravi | Sign a client's form and send it back today. | Place a visible signature and download the signed form. |
| Meera | Turn photos of handwritten notes into one PDF. | Download one readable PDF with photos in her chosen order. |

Ravi sends the downloaded file himself; the site does not send documents.
Signing means placing a visible signature, without certificate-based digital signing.
Meera's notes remain images; converting them does not recognize or transcribe handwriting.

## Functional requirements

The tool registry is the source of truth for tool names, descriptions, groups, and fixed slugs.
Each tool's address is `/tools/<slug>`, using its explicit, unique slug from `src/lib/tools.ts`.
Never derive a tool address from its display name; renaming a tool must preserve existing links.
Each tool will have its own page and use the shared shell and browser PDF engine.
Pages stay marked "Coming soon" until their implementation and done criteria pass.

### Home page and site navigation

The home page follows `DESIGN.md` with a privacy-led hero, working merge drop zone, browse and privacy anchors,
fact strip, searchable category-filtered registry cards, one dark privacy band, and FAQs.
All eleven tools must be directly linked in the scrollable grid. There is no first-screen tool-fit requirement.
Show three ready tools and eight coming soon. Do not claim offline support or unfinished operations work today.
Check 1280×720, 1366×768, and 390×844 in light and dark without horizontal overflow.

The top of every page has the logo, registry-driven group dropdowns, About, privacy pill, and theme toggle.
Derive groups and tools from the registry, linking to fixed slugs. Only one dropdown opens at a time;
outside clicks and Escape dismiss it. Keep keyboard, pointer, and touch navigation usable.
Keep only the current route's page content mounted. Path changes remove previous pages and PDF workspaces;
returning to a different path starts fresh. Same-page hash links preserve local state. The shared header,
footer, and theme remain mounted.
At 760px and below, show a full-height mobile sheet with category accordions under the header.
Selecting a link closes the sheet. The theme follows the system initially and saves a manual preference.
About explains the privacy promise and current availability, including that internet is required to load assets.

### Tools and shared shell

| Tool | Group | Required behavior |
| --- | --- | --- |
| Merge PDF | Organize | Bring multiple PDFs together in one file, in the chosen order. |
| Split PDF | Organize | Separate a PDF into smaller PDFs using chosen page ranges. |
| Extract pages | Organize | Save selected pages from a PDF into a new PDF. |
| Rotate PDF | Organize | Turn selected pages to the chosen orientation. |
| Reorder & delete | Organize | Arrange or remove pages and save the result. |
| Images to PDF | Convert | Turn images into a single PDF in the chosen order. |
| PDF to images | Convert | Save selected PDF pages as image files. |
| Page numbers | Edit | Add clear page numbers to a PDF. |
| Watermark PDF | Edit | Add a visible watermark to chosen pages. |
| Sign PDF | Edit | Place a visible signature on a document. |
| Compress PDF | Optimize | Reduce file size when possible and explain when no reduction is available. |

The shared shell handles file selection, tool options, progress, errors, downloads, and reset.
Skip files whose name and size match a file already selected, including repeats within one selection.
Announce skipped files in the status line, for example: "invoice.pdf is already in the list."
Input errors must be understandable and allow visitors to correct their selection and retry.
The foundation currently accepts PDFs on every page, including Images to PDF; image input belongs to task 11.
Show a thumbnail for every page using pdf.js, which is used only for previews at this stage.
Use `@cantoo/pdf-lib` for PDF validation and future changes inside the shared Web Worker.
Jobs carry the tool slug, file buffers, and options; replies carry progress, a result, or a readable error.
Run one job at a time and transfer buffers unless the caller still needs them.
Keep browser File objects for preview and retry, reading fresh buffers for transfer instead of copying buffers.
Reset and unmount must terminate work, ignore late replies, and release files, previews, and result URLs.

## Non-functional requirements

- **Privacy:** All file processing happens in the visitor's browser. File contents, including derived images and
  signatures, must never be sent to a server, external processing API, or analytics service.
- **Speed:** Avoid upload and server-processing delays. Run PDF work in a Web Worker so interaction stays responsive.
  Show clear progress or a working state during processing; handle failures without leaving the UI stuck.
- **Simplicity:** No account or sign-up. Use a consistent choose, configure, process, and download flow.
  File controls, options, errors, and downloads must be usable by keyboard and on narrow screens.
- **Cost:** Hosting must fit Vercel's free Hobby plan without paid processing services or server-side PDF jobs.
  Review hosting usage and current plan limits before introducing dependencies or infrastructure that add cost.
  This is a deployment constraint, not a claim that usage is unlimited.

Numeric performance targets belong to later implementation work. The PDF-library choice is in decision 6.
Browser memory and device capacity limit job sizes; failures must offer a useful recovery path.

## Visual identity

Follow [DESIGN.md](../DESIGN.md) for warm paper (#f7f6f3), ink (#17171a), privacy green (#007d50),
locally hosted Instrument Sans and JetBrains Mono, borders, spacing, and light/dark CSS tokens.
Use green for privacy, local processing, and success; primary actions use ink and downloads use green.
The Locked page SVG serves as both shared logo and favicon at the existing file path.
Keep text readable in both themes, keyboard focus visible, and tap targets at least 40px (44px for navigation).

## Out of scope

- Password protection and unlocking encrypted PDFs.
- Accounts, sign-up, and saved user profiles.
- OCR, including handwriting recognition or searchable-text conversion.

Server processing is outside the current architecture. Any later proposal for heavy jobs requires revisiting
the browser-processing decision and the privacy promise before implementation.
