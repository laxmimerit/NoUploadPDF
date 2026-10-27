---
name: ship-it
description: >-
  Check and commit NoUploadPDF work on a branch, then stop. Push and create or update a pull request
  only after the user says push. Use only when explicitly called by name as $ship-it or ship-it.
---

# Ship it

Use only when the user calls this skill by name. Creating or editing this skill does not invoke it.
Work from the repository root. Never commit on `main`, push without the user's explicit push instruction,
or merge a pull request. Never use Chrome or Computer Use; Codex's in-app browser is fine for checking pages.
Returning a preview link does not authorize opening it.

## Check and commit

1. Read `AGENTS.md`, applicable nested instructions, `docs/requirements.md`, `docs/decisions.md`,
   `docs/tasks.md`, and the actual scripts in `package.json`. Inspect the working tree and staged diff.
   Include only the intended work; preserve unrelated edits and never stage everything blindly.
   Update relevant project records and tick tasks only when their done criteria pass.
2. Check the current branch before any commit. On `main`, create and switch to a short, descriptive
   `codex/` branch with `git switch -c codex/<short-name>`. On a detached HEAD, create a `codex/` branch
   first too. Reuse an existing work branch. Never commit on `main`, even for a follow-up fix.
3. Fetch `origin/main` without merging or rewriting work. Stop if the fetch fails; do not use stale history.
   Run every check required by applicable `AGENTS.md` files, using scripts that actually exist in
   `package.json`. Currently these are `npm test`, `npm run lint`, `npm run typecheck`, and
   `npm run build:webpack`.
   Run applicable task-specific tests too. If a required script is missing, report the discrepancy and stop;
   do not silently skip it or invent a replacement. Fix failures within the task and rerun affected checks.
   If Chromium cannot start in this Mac's agent sandbox before any page opens, report the startup error
   and defer e2e execution to the required pull-request CI check. Existing evidence from the current session
   is sufficient; do not repeat a confirmed startup failure. Every other required check and the guard must
   still pass before committing. This exception does not cover failing browser assertions, server startup
   failures, or other test failures. Do not report local e2e as passed or tick off its task while CI is pending.
4. Stage the intended files explicitly. Review the staged diff without exposing credentials or emails.
   Run the bundled guard from the repository root:

   ```sh
   bash .agents/skills/ship-it/scripts/check-secrets.sh
   ```

   It requires Git, Python 3, `origin/main`, complete local history, and a repository-local `user.email`.
   It checks staged blobs and all commits in `origin/main..HEAD`, including intermediate and merged commits.
   It rejects `.env*` path components, private-key material, known token formats, literal credential assignments,
   coauthor trailers in files or messages, and author/committer emails different from local `user.email`.
   Only the literal-credential rule exempts the exact paths `scripts/generate-test-fixtures.mjs`,
   `tests/pdf-errors.test.ts` and `src/lib/pdf-engine/errors.ts`, which contain the fictional fixture password and locked-PDF error copy.
   Every other rule still applies to these files; every other file is fully checked.
   It also verifies the effective identities for the next commit, including environment overrides.
   The scanner is heuristic for secrets; passing does not prove that arbitrary encoded secrets are absent.
   Diagnostics never print emails, secret values, paths, commit messages, or raw Git errors.
   Do not print identity values through other commands either.
5. Stop on a guard failure. Report its category, fix only within the authorized work, then rerun it.
   Do not bypass the guard, change identity configuration to make it pass, or rewrite existing commits
   without authorization. Do not add any `Co-Authored-By` trailer.
6. With checks passing, recheck the branch, then commit with a short, clear message. If there is nothing
   staged, do not create an empty commit; check and report the existing branch commits instead.
   Rerun the guard after committing to verify the resulting commit and any hook changes.
   If hooks change source, rerun affected project checks before reporting success.
7. **Stop here.** Show the short commit hash and subject without author/committer details, plus each check's
   result and the guard result. Do not push, open/update a PR, or start a background push.
   Even if the initial invocation includes push, present this checkpoint and wait for the user's next push message.

## Only after the user says push

1. Resume the checked branch. Verify the branch, HEAD, and working tree still match the reported work.
   If the work changed, repeat the relevant checks and commit checkpoint, then wait for push again.
   Fetch `origin/main` again and rerun the guard before pushing. Stop if anything fails.
2. Push this branch to `origin`, setting its upstream when needed. Never push `main` or force-push.
   Look for an open PR for this exact head branch and base `main`. Update that PR's title/body, or create
   one if absent. Use a short summary of the final change and the actual check results, including the guard.
   With `gh`, pass multiline descriptions via `--body-file`. Never merge or enable auto-merge.
   After creating a PR, attach it to the chat with the available `attach_artifact` tool; also attach an existing
   PR when updating it. Do not open browser pages just to create or inspect the PR when APIs/CLI suffice.
3. Wait for CI and the Vercel preview for the pushed commit, using provider checks/deployment metadata.
   Verify their revision matches the pushed HEAD; do not reuse an older green run or preview.
   When local e2e was deferred for the browser startup limitation, explicitly verify the required PR e2e
   check passes for this commit. It remains required before merge.
   Poll at reasonable intervals and keep the user informed. Stop on failure, authentication/permission errors,
   or after 15 minutes pending; report the blocker and pending checks honestly. Do not create a monitor
   or retry deployments automatically. Fixes requiring new commits return to the commit checkpoint.
4. Return the PR link, current CI and Vercel results, and the verified Vercel preview link as Markdown links.
   Do not open the preview. If a preview is unavailable, say so instead of guessing a URL.
   Stop before merging; the user decides whether and when to merge.
