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
The home page uses a compact introduction and grouped tool grid. A shared header on every page contains
the logo and name on the left, registry-driven tool-group dropdowns, and an About link.
About explains local previews, browser-only processing, the three available tools, and the unfinished tools.
The favicon uses a teal PDF page with a white lock, supplied by `src/app/icon.svg` as the site's only icon.
The favicon passed its live-site browser-tab check on 2026-10-27.
Vitest covers registry contracts, PDF validation and worker jobs, and recovery messages using fictional fixtures.
CI runs unit tests, lint, type checking, and a build.
Playwright is configured for Chromium visitor tests using the shared fixtures: first-screen tool discovery,
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

The home page must explain what NoUploadPDF does within the first screen: free PDF tools designed to process
files in the browser without uploading them. Keep current availability clear while processing is being built.
Every tool must be visible and directly linked in the initial viewport of a laptop, without scrolling.
Use a short headline and one supporting line above the grouped tool grid. Narrow screens may scroll vertically.

The top of every page must have the logo and name on the left, followed by one dropdown per registry tool group.
Derive both the groups and their tools from the registry; never maintain a separate list.
Each dropdown links to every tool in that group using its fixed slug.
The menu also links to a short About page at `/about`, which explains the site's purpose and browser-only privacy
promise without claiming unfinished functionality works today.
Dropdowns must work with keyboard, pointer, and touch input, including on narrow screens.

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

The primary accent is Tailwind `teal-800`: `oklch(43.7% 0.078 188.216)`.
It comes from the shared logo and PDF wordmark in `src/components/site-header.tsx` and the home-page tool icons;
the value is defined in the installed Tailwind theme.
Use this accent for the planned favicon: a PDF page with a lock, legible at browser-tab sizes.
Use neutral colors as needed for contrast; introduce no second favicon accent.

## Out of scope

- Password protection and unlocking encrypted PDFs.
- Accounts, sign-up, and saved user profiles.
- OCR, including handwriting recognition or searchable-text conversion.

Server processing is outside the current architecture. Any later proposal for heavy jobs requires revisiting
the browser-processing decision and the privacy promise before implementation.
