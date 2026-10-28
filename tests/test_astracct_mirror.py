import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('mirror', Path(__file__).parents[1] / 'ops/astracct-downloads/sync.py')
mirror = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mirror)

def release(version, variants):
    assets = []
    for index, variant in enumerate(variants):
        extension = 'zip' if variant in ('windows-x64', 'macos-universal') else 'apk'
        name = f'astracct-{version}-{variant}.{extension}'
        assets.append({'id': index + 1, 'name': name, 'size': 4, 'digest': 'sha256:' + hashlib.sha256(b'PKxx').hexdigest(), 'browser_download_url': 'https://github.com/example'})
    return {'draft': False, 'prerelease': True, 'tag_name': 'v' + version, 'html_url': 'https://github.com/southkite2023/quota-hub/releases/tag/v' + version, 'body': 'test', 'assets': assets}

class MirrorTests(unittest.TestCase):
    def test_per_platform_latest_does_not_reuse_old_android_architectures(self):
        packages = mirror.select([release('1.3.0', ['universal']), release('1.2.0', ['arm64-v8a', 'windows-x64', 'macos-universal'])])
        self.assertEqual({(p['platform'], p['version']) for p in packages}, {('android', '1.3.0'), ('windows', '1.2.0'), ('macos', '1.2.0')})
        self.assertFalse(any(p['architecture'] == 'arm64-v8a' for p in packages))
    def test_missing_digest_cannot_be_advertised(self):
        data = release('1.3.0', ['universal']); data['assets'][0]['digest'] = None
        with self.assertRaises(ValueError): mirror.select([data])
    def test_download_failure_preserves_previous_manifest_and_cleans_partial(self):
        data = [release('1.3.0', ['universal', 'windows-x64', 'macos-universal'])]
        with tempfile.TemporaryDirectory() as path:
            root = Path(path); (root / 'latest.json').write_text('previous')
            def request(url, binary=False):
                return io.BytesIO(b'evil' if binary else json.dumps(data).encode())
            with patch.object(mirror, 'request', request), self.assertRaises(ValueError): mirror.sync(root)
            self.assertEqual((root / 'latest.json').read_text(), 'previous')
            self.assertEqual(list(root.glob('*/.download-*')), [])
    def test_all_verified_files_are_published_together_and_rerun_is_idempotent(self):
        data = [release('1.3.0', ['universal', 'windows-x64', 'macos-universal'])]
        with tempfile.TemporaryDirectory() as path:
            def request(url, binary=False): return io.BytesIO(b'PKxx' if binary else json.dumps(data).encode())
            with patch.object(mirror, 'request', request):
                mirror.sync(Path(path)); mirror.sync(Path(path))
            manifest = json.loads((Path(path) / 'latest.json').read_text())
            self.assertEqual(len(manifest['packages']), 3)
            self.assertTrue(all((Path(path) / ('v' + p['version']) / p['file']).exists() for p in manifest['packages']))

if __name__ == '__main__': unittest.main()

class DmgCompatibilityTests(unittest.TestCase):
    def test_dmg_is_mirrored_but_never_breaks_the_native_update_manifest(self):
        data=release('3.0.0', ['universal', 'windows-x64', 'macos-universal'])
        dmg=dict(data['assets'][-1]);dmg['name']='astracct-3.0.0-macos-universal.dmg';dmg['id']=99
        data['assets'].append(dmg)
        self.assertEqual(len(mirror.select([data])),4)
        with tempfile.TemporaryDirectory() as path:
            def request(url,binary=False):
                return io.BytesIO(b'PKxx' if binary else json.dumps([data]).encode())
            with patch.object(mirror,'request',request):mirror.sync(Path(path))
            packages=json.loads((Path(path)/'latest.json').read_text())['packages']
            self.assertEqual(len(packages),3)
            self.assertFalse(any(p['file'].endswith('.dmg') for p in packages))
            self.assertTrue((Path(path)/'v3.0.0'/dmg['name']).is_file())
