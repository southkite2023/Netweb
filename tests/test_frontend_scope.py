import json
import runpy
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/check-frontend-scope.py'


class FrontendScopeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git('init', '-q')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'user.name', 'Test')
        self.write('src/page.js', 'old')
        self.write('server/api.js', 'old api')
        self.old = self.commit('baseline')
        self.manifest = self.root / 'deployed.json'
        self.manifest.write_text(json.dumps({'commit': self.old}))

    def git(self, *args):
        return subprocess.run(['git', *args], cwd=self.root, check=True,
                              capture_output=True, text=True).stdout.strip()

    def write(self, name, content):
        p = self.root / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content)

    def commit(self, message):
        self.git('add', '.')
        self.git('commit', '-qm', message)
        return self.git('rev-parse', 'HEAD')

    def check(self, target, allowed, confirmed=False, zh_v2=False):
        argv = ['python3', str(SCRIPT), str(self.manifest), target]
        if confirmed:
            argv.append('--confirmed-calendar-backend')
        if zh_v2:
            argv.append('--confirmed-calendar-zh-v2')
        result = subprocess.run(argv,
                                cwd=self.root, capture_output=True, text=True)
        self.assertEqual(result.returncode == 0, allowed, result.stdout + result.stderr)

    def test_frontend_only_allowed(self):
        self.write('src/page.js', 'new')
        self.check(self.commit('frontend'), True)

    def test_pending_backend_from_earlier_commit_blocks(self):
        self.write('server/api.js', 'incompatible api')
        self.commit('backend')
        self.write('src/page.js', 'new')
        self.check(self.commit('later frontend'), False)

    def test_manually_deployed_calendar_can_be_acknowledged_only_with_pinned_blobs(self):
        # Reuse the real release code so Git hashing must exactly match the
        # reviewed PR, not a generic server change or a path prefix.
        root = SCRIPT.parents[1]
        for filename in ('server/src/index.js', 'server/src/calendar-feed.js', 'server/tests/calendar-feed.test.mjs'):
            self.write(filename, (root / filename).read_text())
        target = self.commit('pinned manual backend release')
        self.check(target, False)  # default guard still rejects
        # A future backend release may differ from the one-time pinned
        # calendar API rollout. Such a changed backend must not pass this
        # scope exception even when the confirmed flag is supplied.
        pinned = runpy.run_path(str(SCRIPT))["CALENDAR_RELEASE_BLOBS"]
        matches = all(
            self.git('hash-object', str(root / filename)) == expected
            for filename, expected in pinned.items()
        )
        self.check(target, matches, confirmed=True)

    def test_unpinned_backend_change_never_passes_confirmed_flag(self):
        self.write('server/src/index.js', 'arbitrary backend')
        self.write('server/src/calendar-feed.js', 'unapproved module')
        target = self.commit('unapproved backend')
        self.check(target, False, confirmed=True)

    def test_unrelated_protected_changes_still_block_even_if_calendar_is_verified(self):
        root = SCRIPT.parents[1]
        for filename in ('server/src/index.js', 'server/src/calendar-feed.js', 'server/tests/calendar-feed.test.mjs'):
            self.write(filename, (root / filename).read_text())
        self.write('server/sql/999_bad.sql', 'DROP TABLE example')
        target = self.commit('backend plus migration')
        self.check(target, False, confirmed=True)

    def test_reviewed_bilingual_calendar_v2_only_exact_pinned_blobs(self):
        root = SCRIPT.parents[1]
        pinned = runpy.run_path(str(SCRIPT))['CALENDAR_ZH_V2_RELEASE_BLOBS']
        for filename in pinned:
            self.write(filename, (root / filename).read_text())
        target = self.commit('reviewed bilingual API v2')
        self.check(target, False)
        self.check(target, True, zh_v2=True)

    def test_unpinned_or_extra_backend_changes_never_pass_v2_flag(self):
        root = SCRIPT.parents[1]
        pinned = runpy.run_path(str(SCRIPT))['CALENDAR_ZH_V2_RELEASE_BLOBS']
        for filename in pinned:
            self.write(filename, (root / filename).read_text())
        self.write('server/src/unknown-privileged-module.js', 'unauthorized code')
        self.check(self.commit('unexpected additional backend file'), False, zh_v2=True)

    def test_bilingual_v2_rejects_modified_target_blob(self):
        root = SCRIPT.parents[1]
        pinned = runpy.run_path(str(SCRIPT))['CALENDAR_ZH_V2_RELEASE_BLOBS']
        for filename in pinned:
            self.write(filename, (root / filename).read_text())
        self.write('server/src/calendar-feed.js', 'modified and not verified')
        self.check(self.commit('tampered backend'), False, zh_v2=True)

    def test_migration_blocks(self):
        self.write('server/sql/006.sql', 'ALTER TABLE example;')
        self.check(self.commit('migration'), False)

    def test_receiver_change_blocks(self):
        self.write('scripts/receive-github-frontend.py', 'changed')
        self.check(self.commit('receiver'), False)

    def test_invalid_manifest_blocks(self):
        self.manifest.write_text('{"commit":"--help"}')
        self.check(self.old, False)

    def test_unknown_commit_blocks(self):
        self.manifest.write_text(json.dumps({'commit': 'f' * 40}))
        self.check(self.old, False)

    def test_unrelated_history_blocks(self):
        self.git('checkout', '--orphan', 'other')
        self.check(self.commit('unrelated'), False)


if __name__ == '__main__':
    unittest.main()
