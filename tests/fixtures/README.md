# PDF fixtures

All content is fictional. These small files are committed so tests run immediately after `npm ci`.
Regenerate them from the repository root with `npm run fixtures:generate`.
The script uses the existing `@cantoo/pdf-lib` dependency and does not access the network.

| File | Expected behavior |
| --- | --- |
| `invoice.pdf` | One-page invoice. Validation returns 1; range `1` works for Split and Extract. |
| `report.pdf` | Twelve labeled report pages. Validation returns 12; range operations preserve selected page labels. |
| `five-pages.pdf` | First five labeled report pages, for split/extract acceptance checks. |
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
preview rendering, or end-to-end tests. Split and Extract operation tests reopen outputs with both Cantoo
and pdf.js, comparing visible page text and order with the source fixture. The five-page fixture is copied
from the first five report pages, so its visible footer retains the original report's twelve-page numbering.
