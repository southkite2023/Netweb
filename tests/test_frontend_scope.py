import json
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

    def check(self, target, allowed):
        result = subprocess.run(['python3', str(SCRIPT), str(self.manifest), target],
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
