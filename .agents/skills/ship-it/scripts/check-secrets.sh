#!/usr/bin/env bash
# Read Git objects, not working-tree files. Never echo Git output or matched values.
set -euo pipefail
if ! command -v python3 >/dev/null 2>&1; then
  printf '%s\n' 'FAIL: Python 3 is required.' >&2
  exit 1
fi
exec python3 - <<'PY'
import os
import re
import subprocess
import sys


class Rejected(Exception):
    pass


def git(*args):
    result = subprocess.run(
        ['git', '--no-replace-objects', *args],
        stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    if result.returncode:
        raise Rejected('Git prerequisite or object read failed; no scan was accepted.')
    return result.stdout


# Patterns are kept as expressions so the scanner's own source contains no token fixtures.
RULES = [
    ('private-key material', re.compile(
        rb'-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----'
        rb'|PuTTY-User-Key-File-[0-9]+:', re.I)),
    ('coauthor line', re.compile(rb'^\s*Co-Authored-By\s*:', re.I | re.M)),
    ('token format', re.compile(
        rb'\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}'
        rb'|sk-(?:proj-|svcacct-|ant-)?[A-Za-z0-9_-]{20,}'
        rb'|[rs]k_(?:live|test)_[A-Za-z0-9]{16,}'
        rb'|(?:AKIA|ASIA)[A-Z0-9]{16}|xox[baprs]-[A-Za-z0-9-]{10,}'
        rb'|(?:vercel|vcp|npm|pypi|glpat|hf)_[A-Za-z0-9_-]{16,}'
        rb'|(?:glpat|pypi)-[A-Za-z0-9_-]{16,}'
        rb'|AIza[A-Za-z0-9_-]{30,}'
        rb'|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b')),
    ('literal credential', re.compile(
        rb'''["']?\b(?:[A-Za-z0-9_]*(?:api[_-]?key|access[_-]?key|token|secret|password))'''
        rb'''["']?\s*[:=]\s*(["'])(?!\$\{|\$[A-Za-z_])[^"'\r\n]+\1''', re.I)),
    ('literal credential', re.compile(
        rb'^\s*(?:export\s+)?[A-Z0-9_]*(?:API_?KEY|ACCESS_?KEY|TOKEN|SECRET|PASSWORD)'
        rb'\s*=\s*[A-Za-z0-9_/+~=-]+\s*(?:\#.*)?$', re.M)),
    ('authorization credential', re.compile(rb'\bBearer\s+[A-Za-z0-9_./+~=-]{8,}', re.I)),
]

# These files contain the fictional locked-PDF fixture password and its visitor-facing error message.
# Only the literal-credential rule is exempt; exact paths only, with every other rule still applied.
LITERAL_CREDENTIAL_ALLOWLIST = {
    b'scripts/generate-test-fixtures.mjs',
    b'tests/pdf-errors.test.ts',
    b'src/lib/pdf-engine/errors.ts',
}


def scan(data, scope, path=None):
    # Also inspect ASCII carried in UTF-16/32; do not skip binary blobs.
    candidates = [data, data.replace(b'\0', b'')] if b'\0' in data else [data]
    for category, pattern in RULES:
        if category == 'literal credential' and path in LITERAL_CREDENTIAL_ALLOWLIST:
            continue
        if any(pattern.search(candidate) for candidate in candidates):
            raise Rejected(f'{category} in {scope}.')


def identity_email(identity):
    match = re.fullmatch(rb'.* <([^<>\r\n]+)> [0-9]+ [+-][0-9]{4}', identity)
    if not match:
        raise Rejected('Unrecognized Git identity; no scan was accepted.')
    return match.group(1)


def check_identity(identity, expected, scope):
    if identity_email(identity) != expected:
        raise Rejected(f'Identity email mismatch in {scope}.')


def scan_changes(raw, scope, seen):
    entries = raw.split(b'\0')
    if entries[-1] != b'' or (len(entries) - 1) % 2:
        raise Rejected('Unrecognized Git change list; no scan was accepted.')
    for offset in range(0, len(entries) - 1, 2):
        header, path = entries[offset:offset + 2]
        fields = header.split()
        if len(fields) != 5 or not fields[0].startswith(b':'):
            raise Rejected('Unrecognized Git change entry; no scan was accepted.')
        if any(part.lower().startswith(b'.env') for part in path.split(b'/')):
            # Reject paths before looking up their contents, including removed .env files.
            raise Rejected(f'Environment file path in {scope}.')
        scan(path, scope)
        new_mode, blob = fields[1], fields[3]
        if new_mode == b'000000':
            continue
        if new_mode == b'160000':
            raise Rejected(f'Unscannable submodule change in {scope}.')
        # Identical bytes at another path must be checked under that path's exemption status.
        cache_key = (blob, path in LITERAL_CREDENTIAL_ALLOWLIST)
        if cache_key not in seen:
            scan(git('cat-file', 'blob', blob.decode('ascii')), scope, path)
            seen.add(cache_key)


def main():
    os.chdir(os.fsdecode(git('rev-parse', '--show-toplevel').rstrip(b'\n')))
    if git('rev-parse', '--is-shallow-repository').strip() != b'false':
        raise Rejected('Complete Git history is required.')
    git('rev-parse', '--verify', 'refs/remotes/origin/main^{commit}')
    expected = git('config', '--local', '--get', 'user.email').strip()
    if not expected or b'\n' in expected or b'\r' in expected:
        raise Rejected('A single repository-local user.email is required.')
    check_identity(git('var', 'GIT_AUTHOR_IDENT').rstrip(b'\n'), expected, 'next author')
    check_identity(git('var', 'GIT_COMMITTER_IDENT').rstrip(b'\n'), expected, 'next committer')
    if git('ls-files', '--unmerged', '-z'):
        raise Rejected('Resolve the unmerged index before scanning.')

    seen = set()
    raw_options = ['--raw', '-z', '--no-abbrev', '--no-renames', '--no-ext-diff', '--no-textconv']
    scan_changes(git('diff', '--cached', *raw_options), 'staged changes', seen)
    commits = git('rev-list', 'refs/remotes/origin/main..HEAD').splitlines()
    for commit in commits:
        oid = commit.decode('ascii')
        scope = 'branch commit ' + oid[:12]
        raw_commit = git('cat-file', 'commit', oid)
        headers, message = raw_commit.split(b'\n\n', 1)
        for role in (b'author', b'committer'):
            values = [line[len(role) + 1:] for line in headers.splitlines() if line.startswith(role + b' ')]
            if len(values) != 1:
                raise Rejected(f'Unrecognized commit identity in {scope}.')
            check_identity(values[0], expected, scope)
        scan(message, scope)
        # -m compares merges against every parent; --root covers unrelated root commits.
        changes = git('diff-tree', '--root', '-r', '-m', '--no-commit-id', *raw_options, oid)
        scan_changes(changes, scope, seen)
    print(f'PASS: staged changes, next identities, and {len(commits)} branch commit(s) checked.')


try:
    main()
except Rejected as error:
    print('FAIL: ' + str(error), file=sys.stderr)
    sys.exit(1)
except Exception:
    # Exceptions and child-process stderr can contain identities or secret data.
    print('FAIL: scan could not complete; no scan was accepted.', file=sys.stderr)
    sys.exit(1)
PY
