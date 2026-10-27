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
The home-page tests use 1280×720 and 1366×768 laptop viewports. Header tests visit every registry tool.
The shared-shell tests use `report.pdf` and `renamed-text.pdf` from `tests/fixtures`, with real previews
and the real browser worker. No routes, PDF rendering, or processing responses are mocked.
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
