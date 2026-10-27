# PDF fixtures

All content is fictional. These small files are committed so tests run immediately after `npm ci`.
Regenerate them from the repository root with `npm run fixtures:generate`.
The script uses the existing `@cantoo/pdf-lib` dependency and does not access the network.

| File | Expected behavior |
| --- | --- |
| `invoice.pdf` | One-page invoice. Validation returns 1; range `1` works for Split and Extract. |
| `report.pdf` | Twelve labeled report pages. Validation returns 12; range operations preserve selected page labels. |
| `merge-two.pdf` | Two labeled pages for checking merged content and order. |
| `merge-three.pdf` | Three labeled pages for checking merged content and order. |
| `five-pages.pdf` | First five labeled report pages, for split/extract acceptance checks. |
| `four-pages.pdf` | Four labeled report pages with existing rotations 0, 90, 180, 270 degrees. |
| `damaged.pdf` | PDF header followed by a truncated catalog object. Returns `damaged`. |
| `password-protected.pdf` | One-page invoice encrypted with AES-256. Returns `password`. |
| `renamed-text.pdf` | Plain text saved with a PDF extension. Returns `not-pdf`. |

The locked fixture's user password is `fixture-open`; its owner password is `fixture-owner`.
Passwords are public test data. The app rejects this document without unlocking it.
The invoice and report have fixed dates and repeatable bytes. Encryption uses fresh randomness,
so regenerating the locked file changes its bytes while preserving its content and password behavior.

Run `npm test` once or `npm run test:watch` while editing.
Tests call our registry, validation, worker handler, and error helpers. Only the worker's message port is
stubbed; PDF parsing uses the installed library. These are Node unit tests, not browser worker, transfer,
preview rendering, or end-to-end tests. Merge PDF jobs combine two or more valid files;
unfinished tools still return `not-built`. Merge output tests use pdf.js to read each page's visible text
independently from the editing library, including after reversing the file order.
Split and Extract operation tests reopen outputs with both Cantoo and pdf.js, comparing visible page text
and order with the source fixture. The five-page fixture is copied from the first five report pages,
so its visible footer retains the original report's twelve-page numbering.
