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


def check_scope(manifest_path, target):
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
        raise ValueError('Backend, database, game plugin or server receiver differs from the last deployed release. '
                         'Complete and verify the full deployment first; frontend-only publication has been stopped.')
    print('Frontend-only scope verified against the last public deployment.')


if __name__ == '__main__':
    try:
        if len(sys.argv) != 3:
            raise ValueError('Usage: check-frontend-scope.py DEPLOY_VERSION_JSON TARGET_COMMIT')
        check_scope(sys.argv[1], sys.argv[2])
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f'::error::{error}', file=sys.stderr)
        sys.exit(1)
