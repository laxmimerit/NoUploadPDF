# Chromium visitor tests

From the repository root:

```sh
npm ci
npx playwright install chromium
npm run build:webpack
npm run test:e2e
```

Playwright starts the production server at `http://127.0.0.1:3100` and stops it after the tests.
It refuses to reuse an existing server so a development server cannot accidentally pass as a production check.
The home-page tests use 1280×720, 1366×768, and 390×844 in both themes. They check the privacy-led hero,
browse anchor, every registry tool in the scrollable grid with accurate availability, the privacy anchor,
and no horizontal overflow. Decision 5 replaces the former first-screen tool-fit rule.
Header tests visit every registry tool.
The shared-shell tests use `report.pdf` on the unfinished Rotate PDF page for the not-built state,
and `renamed-text.pdf` on Merge PDF for invalid input. Merge tests use labeled two- and three-page fixtures,
reopen downloads with pdf.js, reverse file order with the keyboard, and check damaged-file recovery,
reset, desktop/narrow layouts, and requests during selection, processing, and download.
They use real previews and the real browser worker. No routes, rendering, or processing responses are mocked.
Scope error and status assertions to the named tool workspace. Next.js also adds an alert for route
announcements outside that region, so a page-wide alert locator is ambiguous.

To test a public deployment instead:

```sh
PLAYWRIGHT_BASE_URL=https://your-preview.vercel.app npm run test:e2e
```

Setting `PLAYWRIGHT_BASE_URL` disables the local server entirely. No local build or deployment token is needed.
Reports go to `playwright-report`; failures retain screenshots and traces in `test-results`.
Open a saved report with `npx playwright show-report`.

On pull requests, CI's `e2e` job runs after `checks` succeeds. It checks out the PR head commit and polls
GitHub deployments for that exact SHA, accepting only a non-production `Preview` from `vercel[bot]`.
It waits up to 20 minutes for a successful current status with an HTTPS `environment_url`.
Failed or inactive deployments fail the job; it never uses an older success, a branch alias, or a PR comment.
The job uses GitHub's automatic read-only token to read deployments; no repository or Vercel secrets are required.
Public previews need no protection bypass token. CI uploads reports and failure traces for seven days.
The CI workflow itself can only be verified on GitHub after the change is pushed.

Split PDF and Extract pages also have visitor tests for invalid range parts, retry, keyboard processing,
multiple downloads, reopened output page counts, option changes, reset focus, and a 320px layout.
They watch for requests with bodies during the workflow. The existing Merge PDF test retains coverage
for merging and file ordering. The Rotate PDF test retains coverage for the not-built state.
