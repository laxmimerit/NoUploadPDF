---
version: alpha
name: NoUploadPDF
description: Private, browser-only PDF tools. Warm paper neutrals, deep ink, and a single privacy green. Calm, precise, trustworthy.
colors:
  primary: "#17171a"
  tertiary: "#007d50"
  secondary: "#55544f"
  neutral: "#f7f6f3"
  surface: "#ffffff"
  accent-container: "#def5e8"
  on-primary: "#f7f6f3"
  on-tertiary: "#ffffff"
  surface-sunk: "#fbfaf8"
  surface-chip: "#f1efea"
  on-surface: "#17171a"
  on-surface-muted: "#6b6a64"
  on-surface-subtle: "#8a8880"
  outline: "#e4e2dc"
  outline-strong: "#d6d3cb"
  divider: "#eeece7"
  accent-light: "#56d298"
  accent: "#019f68"
  accent-text: "#00673f"
  accent-tint: "#e1f8eb"
  inverse-surface: "#17171a"
  inverse-outline: "#2e2e33"
  inverse-on-surface-muted: "#a9a8a2"
  dark-neutral: "#111113"
  dark-surface: "#1a1a1e"
  dark-surface-sunk: "#161619"
  dark-surface-chip: "#2a2a30"
  dark-on-surface: "#ededea"
  dark-secondary: "#b9b8b2"
  dark-on-surface-muted: "#9e9d97"
  dark-on-surface-subtle: "#8b8a84"
  dark-outline: "#2a2a30"
  dark-outline-strong: "#3b3b42"
  dark-divider: "#24242a"
  dark-primary: "#ededea"
  dark-on-primary: "#17171a"
  dark-band: "#19191c"
  dark-accent-text: "#5fd49e"
  dark-accent-container: "#0f3b29"
  dark-accent-tint: "#0d2a1e"
typography:
  headline-display:
    fontFamily: Instrument Sans
    fontSize: 72px
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: -0.035em
  headline-lg:
    fontFamily: Instrument Sans
    fontSize: 52px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Instrument Sans
    fontSize: 34px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.025em
  title-md:
    fontFamily: Instrument Sans
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Instrument Sans
    fontSize: 19px
    fontWeight: 400
    lineHeight: 1.55
  body-md:
    fontFamily: Instrument Sans
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Instrument Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-lg:
    fontFamily: Instrument Sans
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 0.06em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.3
rounded:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 56px
  section: 88px
  section-lg: 96px
  gutter: 12px
  margin: 24px
  max-width: 1160px
  header-height: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 14px 22px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 14px 22px
  button-success:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 14px 24px
  button-disabled:
    backgroundColor: "{colors.on-surface-subtle}"
    textColor: "{colors.on-primary}"
  button-icon:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    size: 30px
  chip-filter:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: 8px 14px
  chip-filter-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  privacy-pill:
    backgroundColor: "{colors.accent-container}"
    textColor: "{colors.accent-text}"
    typography: "{typography.label-mono}"
    rounded: "{rounded.full}"
    padding: 7px 11px
  tool-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 22px
    height: 160px
  drop-zone:
    backgroundColor: "{colors.surface-sunk}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 56px 20px
  drop-zone-active:
    backgroundColor: "{colors.accent-tint}"
  file-row:
    backgroundColor: "{colors.surface-sunk}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 12px 14px
  file-badge:
    backgroundColor: "{colors.surface-chip}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.xs}"
    padding: 4px 6px
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 11px 14px
    width: 260px
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: 24px
  dark-band:
    backgroundColor: "{colors.inverse-surface}"
    textColor: "{colors.on-primary}"
    padding: 88px 24px
  header:
    backgroundColor: "#f7f6f3e6"
    height: 64px
---

# NoUploadPDF

## Overview

NoUploadPDF is a set of free PDF tools (merge, split, extract, rotate, reorder, convert, number, watermark, sign and compress) that run entirely in the browser. Files never leave the user's device, and that promise is the headline of every screen.

The look is calm, precise and trustworthy: warm paper neutrals, a deep ink for text and primary actions, and one privacy green. Layouts are spacious and flat, with thin borders instead of shadows. Monospace type marks technical facts such as file sizes, counters and "0 bytes uploaded", so the privacy claims read like measured data.

Voice is plain and factual. Name what happens to the file ("Processing on this device", "Done. Nothing was uploaded."). No hype, no emoji, no stock illustration.

## Colors

- **Ink (#17171a), primary:** headlines, body text, primary buttons, the logo tile and the single dark band on each page.
- **Paper (#f7f6f3), neutral:** the page background, and text on ink.
- **White (#ffffff), surface:** cards, panels and inputs sit on white above the paper background.
- **Stone greys (secondary, on-surface-muted, on-surface-subtle):** descriptions, meta text, labels and placeholders, in decreasing emphasis.
- **Linen borders (outline, outline-strong, divider):** 1px hairlines that do the job shadows would do elsewhere.
- **Privacy Green (#007d50), tertiary:** reserved for meaning. It marks privacy, local processing and success: privacy pills, status dots, the active drop zone, and the Download button. Never use it decoratively.
- **Accent-light (#56d298):** green on ink backgrounds (step numbers, logo details).

## Typography

**Instrument Sans** (Google Fonts) carries all headlines, body and UI text, in weights 400, 500 and 600. Headlines are semibold with tight negative tracking; use `text-wrap: balance` on headlines and `text-wrap: pretty` on paragraphs. The display size scales fluidly: `clamp(44px, 6vw, 72px)`.

**JetBrains Mono** is used for technical data only: eyebrows (uppercase, +0.06em), file sizes, file indexes, step numbers, counters and privacy facts.

## Layout

Content sits in a centered column with a max width of 1160px and 24px side margins. The tool page narrows to 960px and the About text to 860px. The spacing rhythm is 4/8/12/16/24/32/48/56, with 88–96px between major sections.

- The header is sticky and 64px tall. The logo sits on the left. On the right are the category menus (Organize, Convert, Edit, Optimize), each with a small chevron that opens a 300px dropdown of that category's tools (name plus a one-line description), then About, the "0 bytes uploaded" pill and the theme toggle. Only one dropdown is open at a time, and clicking outside closes it.
- The hero is a two-column auto-fit grid (minimum column 440px, 56px gap): the headline and CTAs on the left, a live drop-zone panel on the right.
- The tool grid is `repeat(auto-fill, minmax(260px, 1fr))` with a 12px gap.
- All layouts reflow to a single column on narrow screens.

## Dark theme

The dark theme keeps the same layout, type and green, and swaps only the neutrals. A sun/moon icon button (40×40, radius 10) at the right end of the header switches themes. The first visit follows the system `prefers-color-scheme`, and the user's choice is saved and reused.

- The page becomes near-black (#111113), cards become #1a1a1e, and drop zones become #161619. Text is #ededea, with greys #b9b8b2, #9e9d97 and #8b8a84.
- The primary button inverts to a light fill (#ededea) with ink text. The "+" squares in drop zones invert the same way.
- Privacy green gets brighter for text (#5fd49e) on a deep green container (#0f3b29). The Download button stays green-600 with white text.
- The dark band becomes #19191c so it still separates from the page. The logo tile lifts to #26262b and the page shape stays paper-colored.
- Hover borders use the text color. The hero shadow becomes `rgba(0,0,0,0.6)`.
- Implement it with CSS custom properties on `:root` and override them on `:root[data-theme="dark"]`. Set `color-scheme` to match.

## Mobile

The breakpoint is 760px. Design and test at 390 × 844.

- **Header:** the logo on the left. On the right, the theme toggle (40px) and a 44px menu button whose three bars animate into an ×.
- **Menu sheet:** a full-height panel under the header, filled with the page color. It starts with the "0 bytes uploaded" pill, then accordion rows (56px tall, 17px/600) for Organize, Convert, Edit and Optimize. Each row expands into tool cards (56px minimum, white surface, name plus description). About is the last row. Picking a tool closes the sheet.
- **Spacing:** 20px side margins. Section padding scales down with `clamp()`: the hero goes from 88px to 40px at the top and the dark band from 88px to 56px.
- **Hero:** a single column. The display headline scales to 44px. The CTAs wrap and stay on one line each. The drop-zone panel sits below the text.
- **Tool grid:** a single column of full-width cards. The filter chips wrap.
- **Tool page:** the file-row icon buttons grow to 40px. The action bar wraps, with the status above the buttons.
- Every tap target is at least 40px, and 44px for primary navigation.

## Elevation & Depth

The design is flat. Hierarchy comes from tonal layers (paper page → white cards → sunk drop zones) and 1px borders. The one shadow is on the hero panel: `0 24px 48px -28px rgba(23,23,26,0.2)`. Card hover changes the border to ink and lifts the card with `translateY(-2px)` over 150ms.

## Shapes

Corners are softly rounded and consistent: 4px badges, 6px icon buttons, 10px buttons, inputs and file rows, 12px cards and drop zones, 16px large panels, and full pills for chips and status. Drop zones use a 1.5px dashed outline-strong border.

## Components

- **Buttons:** primary is ink; secondary is white with an outline-strong border; success (Download) is Privacy Green; working/disabled is subtle grey. Hero buttons must not wrap (`white-space: nowrap`).
- **Privacy pill:** a green container with a 6px accent dot and mono text, e.g. "0 bytes uploaded", "Files stay on this device", "Processing on this device".
- **Drop zone:** a centered 44–48px ink square with "+", then the title "Drop PDFs here" and the hint "or click to choose from your device". The whole zone is clickable. While dragging it switches to accent-tint with an accent border.
- **Tool card:** a mono uppercase category label at the top, with the title and description pinned to the bottom.
- **Filter chips:** "All, Organize, Convert, Edit, Optimize", each with its count in mono at 55% opacity.
- **File row:** index (mono), "PDF" badge, name (ellipsis), size (mono), then ↑ ↓ × icon buttons.
- **Action bar:** three states. Idle shows "Output: merged.pdf" and the primary action. Working shows "Processing on your device…". Done shows "Done. Nothing was uploaded." with Start over and Download.
- **Fact strip:** three cells split by 1px dividers: "0 bytes / sent to servers", "Offline / after first load", "Free / no account".
- **Dark band:** an ink section with a large headline and three step cells (mono green number, title, muted body).
- **Nav dropdown:** a white panel with a 1px outline border, 12px radius, 8px padding and a soft shadow `0 18px 40px -20px rgba(23,23,26,0.25)`. Each item has a title at 14px/600 and a description at 13px muted, with a paper-colored hover. The active category label turns ink.
- **FAQ:** full-width rows split by hairlines, with a mono +/− toggle.

## Do's and Don'ts

- Do lead every page with the privacy promise; it is the product.
- Do use green only for privacy, local processing and success states.
- Do use mono type for numbers, sizes and technical facts.
- Do keep one dark band per page at most.
- Don't use gradients, emoji, heavy shadows or illustrations.
- Don't recolor the logo tile, separate the lock badge from the page, or set the logo below 16px.
- Don't write vague copy like "secure cloud"; say exactly where the file is.
- Do maintain WCAG AA contrast (4.5:1 for body text).

## Logo

The mark is the "Locked page": a paper-colored page with a green folded corner and a green padlock badge cut into its lower-right corner, on an ink tile with a 12/48 corner radius. The wordmark is "NoUpload" in ink with "PDF" in Privacy Green, set in Instrument Sans 600.

The artwork as plain geometry, so it survives any markdown sanitiser and can be redrawn exactly. Draw on a 48 by 48 canvas, in this order:

| # | Shape | Geometry | Paint |
|---|-------|----------|-------|
| 1 | Tile | rect at 0,0 size 48 by 48, corner radius 12 | fill #17171a |
| 2 | Page | path M12 9h14l7 7v23H12z | fill #f7f6f3 |
| 3 | Folded corner | path M26 9v7h7z | fill #3fbf8a |
| 4 | Badge cut-out | rect at 24,24 size 18 by 18, corner radius 4.5 | fill #17171a |
| 5 | Padlock shackle | path M29.5 31v-2.5a3.5 3.5 0 0 1 7 0V31 | stroke #3fbf8a, width 2.6, round caps, no fill |
| 6 | Padlock body | rect at 26.5,30.5 size 13 by 9, corner radius 2.2 | fill #3fbf8a |
| 7 | Keyhole | circle centred 33,35 radius 1.5 | fill #17171a |

On ink and dark surfaces the tile lifts to #26262b and the green darkens to #1f8a5f; the page stays #f7f6f3. The same mark serves as the favicon; do not render it below 16px.

## Content

Tools (category · name · description · action button · output file):

- Organize · Merge PDF · Bring multiple PDFs together in one file. · Merge PDFs · merged.pdf
- Organize · Split PDF · Separate a PDF into smaller files. · Split PDF · split-pages.zip
- Organize · Extract pages · Save just the pages you need. · Extract pages · extracted.pdf
- Organize · Rotate PDF · Turn pages to the right orientation. · Rotate pages · rotated.pdf
- Organize · Reorder & delete · Arrange or remove pages with ease. · Save changes · reordered.pdf
- Convert · Images to PDF · Turn your images into a single PDF. · Create PDF · images.pdf
- Convert · PDF to images · Save PDF pages as image files. · Convert to images · pages.zip
- Edit · Page numbers · Add clear page numbers to your PDF. · Add page numbers · numbered.pdf
- Edit · Watermark PDF · Add a personal mark to your pages. · Add watermark · watermarked.pdf
- Edit · Sign PDF · Add your signature to a document. · Sign document · signed.pdf
- Optimize · Compress PDF · Make a PDF smaller and easier to share. · Compress PDF · compressed.pdf

Pages:

- **Home:** eyebrow "Private PDF tools · Free"; headline "Your PDFs never leave your device."; lead "Merge, split, compress and sign PDFs directly in your browser. Nothing is uploaded, so there is nothing to leak."; CTAs "Browse 11 tools" and "How it stays private"; then "Choose a tool"; then a dark band "The work happens in your browser, not on a server."
- **Tool page:** breadcrumb, H1, description and a privacy pill; then the drop zone, file list and action bar; then "More tools".
- **About:** headline "Built so your documents stay yours."; lead "Most online PDF tools send your files to a server to process them. NoUploadPDF does the work inside your browser instead. Contracts, IDs and invoices are handled on your own device and never travel over the network."

Steps: "Open a file / Pick or drop a PDF. It is read directly by your browser." · "Process locally / Merging, splitting and compressing run on your own device." · "Save the result / Download the new file. Nothing is sent to a server."

FAQ:

- **Are my files uploaded anywhere?** No. Every tool runs in your browser using your device. Files are read locally and the result is saved straight back to your device.
- **Does it work offline?** Once the page has loaded, the tools keep working without an internet connection.
- **Is it free?** Yes. All tools are free to use and no account is needed.
- **Is there a file size limit?** Limits depend on your device's memory rather than a server quota. Very large files may take longer on older devices.
