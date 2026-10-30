#!/usr/bin/env python3
"""Reject automatic frontend publication when the deployed backend may differ."""
import json
from pathlib import Path
import re
import subprocess
import sys

PROTECTED_PATHS = (
    'server/', 'minecraft-plugin/',
    'scripts/receive-github-frontend.py', 'scripts/setup-github-deploy.sh',
)

# ONE-TIME bridge for the API that the owner has already deployed manually.
# These immutable Git blob hashes pin the exact source and test files; arbitrary
# changes to server/, migrations, deployment receiver and plugins still fail.
# The CI caller MUST independently verify the production HTTPS API/ICS first.
CALENDAR_RELEASE_BLOBS = {
    'server/src/index.js': '38d38e1cbfffc27e40bd95cc50627fc392b7e517',
    'server/src/calendar-feed.js': '4b2f25c832ed2f0e4c22d10ddcedca959ac82212',
    # Unit tests are part of the merged PR but never executed on the ECS API.
    'server/tests/calendar-feed.test.mjs': '5e8ef317ab14ea8f56a7f9dfcfc4a1a03c09b017',
}


def check_scope(manifest_path, target, confirmed_calendar_backend=False):
    previous = json.loads(Path(manifest_path).read_text()).get('commit')
    for commit in (previous, target):
        if not isinstance(commit, str) or not re.fullmatch(r'[0-9a-f]{40}', commit):
            raise ValueError('Invalid or missing deployed commit; verify the full release before manual publication.')
        subprocess.run(['git', 'cat-file', '-e', commit + '^{commit}'], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ancestor = subprocess.run(['git', 'merge-base', '--is-ancestor', previous, target])
    if ancestor.returncode != 0:
        raise ValueError('Deployed commit is not an ancestor of this release; reconcile source before publishing.')
    changes = subprocess.run(['git', 'diff', '--name-only', previous, target, '--', *PROTECTED_PATHS],
                             check=True, capture_output=True, text=True).stdout.strip()
    if changes:
        changed_paths = set(changes.splitlines())
        if not confirmed_calendar_backend or changed_paths != set(CALENDAR_RELEASE_BLOBS):
            raise ValueError('Backend, database, game plugin or server receiver differs from the last deployed release. '
                             'Complete and verify the full deployment first; frontend-only publication has been stopped.')
        for filename, expected in CALENDAR_RELEASE_BLOBS.items():
            actual = subprocess.run(
                ['git', 'rev-parse', f'{target}:{filename}'],
                check=True, capture_output=True, text=True
            ).stdout.strip()
            if actual != expected:
                raise ValueError('Calendar backend blob does not match the independently verified manual rollout.')
        print('Exactly the pinned, already-deployed calendar API backend was verified; no other protected changes.')
    else:
        print('Frontend-only scope verified against the last public deployment.')


if __name__ == '__main__':
    try:
        if len(sys.argv) not in (3, 4) or (len(sys.argv) == 4 and sys.argv[3] != '--confirmed-calendar-backend'):
            raise ValueError('Usage: check-frontend-scope.py DEPLOY_VERSION_JSON TARGET_COMMIT [--confirmed-calendar-backend]')
        check_scope(sys.argv[1], sys.argv[2], len(sys.argv) == 4)
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f'::error::{error}', file=sys.stderr)
        sys.exit(1)
