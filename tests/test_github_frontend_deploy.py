"""Safety regression checks; use temporary directories, never a live server."""
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('receiver', Path(__file__).parents[1] / 'scripts/receive-github-frontend.py')
receiver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(receiver)
COMMIT = 'a' * 40


def bundle(extra=(), marker=COMMIT):
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode='w:gz') as archive:
        entries = [('index.html', b'new page'),
                   ('assets/app.js', b'console.log("site")'),
                   ('deploy-version.json', json.dumps({'commit': marker}).encode())]
        for name, data in entries + list(extra):
            if isinstance(name, tarfile.TarInfo):
                archive.addfile(name)
            else:
                member = tarfile.TarInfo(name)
                member.size = len(data)
                archive.addfile(member, io.BytesIO(data))
    return stream.getvalue()


class DeploymentSafety(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.app = Path(self.temp.name) / 'app'
        self.app.mkdir()
        (self.app / 'dist').mkdir()
        (self.app / 'dist/index.html').write_text('old page')
        (self.app / 'server').mkdir()
        (self.app / 'server/.env').write_text('do not touch')
        (self.app / 'user-content').mkdir()
        (self.app / 'user-content/card.webp').write_bytes(b'private artwork')

    def assert_protected(self):
        self.assertEqual((self.app / 'server/.env').read_text(), 'do not touch')
        self.assertEqual((self.app / 'user-content/card.webp').read_bytes(), b'private artwork')

    def reject(self, payload):
        with self.assertRaises((ValueError, FileNotFoundError)):
            receiver.install(payload, COMMIT, self.app, lambda _: None)
        self.assertEqual((self.app / 'dist/index.html').read_text(), 'old page')
        self.assert_protected()

    def test_success_backs_up_and_only_changes_frontend(self):
        def check(commit):
            self.assertEqual(commit, COMMIT)
            self.assertEqual((self.app / 'dist/index.html').read_text(), 'new page')
        receiver.install(bundle(), COMMIT, self.app, check)
        old = list((self.app / 'backups/github-frontend').glob('*/index.html'))
        self.assertEqual(len(old), 1)
        self.assertEqual(old[0].read_text(), 'old page')
        self.assertEqual((self.app / 'dist').stat().st_mode & 0o777, 0o755)
        self.assert_protected()

    def test_real_build_respects_static_archive_policy(self):
        dist = Path(__file__).parents[1] / 'dist'
        if not (dist / 'index.html').is_file():
            self.skipTest('Run the production build first.')
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode='w:gz') as archive:
            for path in sorted(dist.rglob('*')):
                if path.is_file() and path.name != 'deploy-version.json':
                    archive.add(path, arcname=str(path.relative_to(dist)))
            data = json.dumps({'commit': COMMIT}).encode()
            marker = tarfile.TarInfo('deploy-version.json')
            marker.size = len(data)
            archive.addfile(marker, io.BytesIO(data))
        destination = Path(self.temp.name) / 'archive-check'
        destination.mkdir()
        receiver.unpack(stream.getvalue(), destination, COMMIT)
        self.assertTrue((destination / 'index.html').is_file())
        self.assert_protected()

    def test_health_failure_restores_previous_site(self):
        def check(_):
            raise RuntimeError('health check failed')
        with self.assertRaises(RuntimeError):
            receiver.install(bundle(), COMMIT, self.app, check)
        self.assertEqual((self.app / 'dist/index.html').read_text(), 'old page')
        self.assertFalse((self.app / 'dist/deploy-version.json').exists())
        self.assert_protected()

    def test_failed_second_rename_restores_site(self):
        original = Path.rename
        def rename(path, target):
            if path.parent.name.startswith('.github-stage-') and path.name == 'dist':
                raise OSError('simulated rename failure')
            return original(path, target)
        with patch.object(Path, 'rename', rename), self.assertRaises(OSError):
            receiver.install(bundle(), COMMIT, self.app, lambda _: None)
        self.assertEqual((self.app / 'dist/index.html').read_text(), 'old page')
        self.assert_protected()

    def test_interruption_after_swap_restores_site(self):
        def interrupt(_):
            raise KeyboardInterrupt()
        with self.assertRaises(KeyboardInterrupt):
            receiver.install(bundle(), COMMIT, self.app, interrupt)
        self.assertEqual((self.app / 'dist/index.html').read_text(), 'old page')

    def test_traversal_absolute_paths_and_dotfiles_rejected(self):
        for path in ['../outside', '/tmp/overwrite', 'assets/../../server/.env', '.env', 'assets/.env']:
            with self.subTest(path=path):
                self.reject(bundle([(path, b'bad')]))

    def test_links_and_special_files_rejected(self):
        for kind in [tarfile.SYMTYPE, tarfile.LNKTYPE, tarfile.FIFOTYPE]:
            member = tarfile.TarInfo('assets/link')
            member.type = kind
            member.linkname = '/etc/passwd'
            self.reject(bundle([(member, None)]))

    def test_duplicate_paths_rejected(self):
        self.reject(bundle([('index.html', b'overwrite')]))

    def test_backend_paths_rejected(self):
        self.reject(bundle([('server/index.js', b'backend')]))

    def test_wrong_commit_rejected(self):
        self.reject(bundle(marker='b' * 40))

    def test_oversized_expansion_rejected(self):
        with patch.object(receiver, 'MAX_EXPANDED', 16):
            self.reject(bundle())

    def test_symlinked_dist_rejected(self):
        (self.app / 'dist').rename(self.app / 'real-dist')
        (self.app / 'dist').symlink_to(self.app / 'real-dist')
        self.reject(bundle())

    def test_only_exact_deploy_command_is_accepted(self):
        self.assertEqual(receiver.command_commit('deploy ' + COMMIT), COMMIT)
        for command in ['sh', 'cat /etc/passwd', 'deploy ' + COMMIT + ';id', 'deploy ' + COMMIT + '\n', '']:
            with self.assertRaises(ValueError):
                receiver.command_commit(command)


if __name__ == '__main__':
    unittest.main()
