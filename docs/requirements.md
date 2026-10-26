# NoUploadPDF requirements

## Product promise

NoUploadPDF provides free, simple PDF tools. Files never leave the visitor's browser.
Visitors choose files, process them on their device, and download the result without an account or sign-up.

Read this PRD with the [decisions](decisions.md) and [task checklist](tasks.md).

## Current state

The home page links to eleven tool pages using fixed slugs from `src/lib/tools.ts`.
Each page shows its registry name and description and is marked "Coming soon".
The shared tool shell and PDF engine are planned work; the tools do not yet process files.
The favicon uses a teal PDF page with a white lock, supplied by `src/app/icon.svg` as the site's only icon.
The favicon passed its live-site browser-tab check on 2026-10-27.
CI runs lint, type checking, and a build. Vercel preview integration was verified through PR #8 on 2026-10-27.
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
Input errors must be understandable and allow visitors to correct their selection and retry.

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

Numeric performance targets and PDF-library selection belong to later implementation work.
Browser memory and device capacity limit job sizes; failures must offer a useful recovery path.

## Visual identity

The primary accent is Tailwind `teal-800`: `oklch(43.7% 0.078 188.216)`.
It comes from the current home-page logo background, PDF wordmark, and tool icons in `src/app/page.tsx`;
the value is defined in the installed Tailwind theme.
Use this accent for the planned favicon: a PDF page with a lock, legible at browser-tab sizes.
Use neutral colors as needed for contrast; introduce no second favicon accent.

## Out of scope

- Password protection and unlocking encrypted PDFs.
- Accounts, sign-up, and saved user profiles.
- OCR, including handwriting recognition or searchable-text conversion.

Server processing is outside the current architecture. Any later proposal for heavy jobs requires revisiting
the browser-processing decision and the privacy promise before implementation.
