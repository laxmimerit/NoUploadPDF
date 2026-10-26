# PDF engine rules

- Runs inside a Web Worker: no DOM, React, or `window`.
- File contents never leave the browser: no `fetch` or analytics.
- Keep one PDF operation per file.
