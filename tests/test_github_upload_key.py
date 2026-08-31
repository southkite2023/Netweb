"""Exercise key decoding with throwaway keys and a fake SSH executable."""
import base64
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).parents[1] / 'scripts/github-upload-frontend.sh'


class UploadKeyHandling(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.key = self.root / 'test-key'
        subprocess.run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', str(self.key)], check=True)
        self.raw = self.key.read_text()
        self.single_line = base64.b64encode(self.key.read_bytes()).decode()
        self.server_key = self.root / 'server-key'
        subprocess.run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', str(self.server_key)], check=True)
        self.host_public_key = self.server_key.with_suffix('.pub').read_text().strip()
        bin_dir = self.root / 'bin'
        bin_dir.mkdir()
        ssh = bin_dir / 'ssh'
        ssh.write_text('''#!/usr/bin/env bash
set -euo pipefail
while (($#)); do
  if [[ $1 == -i ]]; then key=$2; shift; fi
  if [[ $1 == UserKnownHostsFile=* ]]; then hosts=${1#UserKnownHostsFile=}; fi
  if [[ $1 == StrictHostKeyChecking=yes ]]; then strict=yes; fi
  shift
done
[[ $(stat -c %a "$key") == 600 ]]
[[ $(ssh-keygen -y -P '' -f "$key") == $(ssh-keygen -y -P '' -f "$EXPECTED_KEY") ]]
[[ ${strict:-} == yes ]]
[[ $(ssh-keygen -l -f "$hosts" | awk '{print $2}') == $(ssh-keygen -l -f "$EXPECTED_SERVER_KEY" | awk '{print $2}') ]]
touch "$CONTACT_MARKER"
cat >/dev/null
''')
        ssh.chmod(0o755)
        (self.root / 'yuashie-frontend.tar.gz').write_bytes(b'test archive')
        self.env = dict(os.environ, PATH=str(bin_dir) + ':' + os.environ['PATH'],
                        DEPLOY_HOST='example.com', DEPLOY_PORT='22',
                        DEPLOY_KNOWN_HOSTS='example.com ' + self.host_public_key,
                        GITHUB_SHA='a' * 40, RUNNER_TEMP=str(self.root),
                        EXPECTED_KEY=str(self.key), EXPECTED_SERVER_KEY=str(self.server_key.with_suffix('.pub')),
                        CONTACT_MARKER=str(self.root / 'contacted'))

    def run_key(self, value, accepted):
        result = subprocess.run(['bash', str(SCRIPT)], env=dict(self.env, DEPLOY_SSH_KEY=value),
                                capture_output=True, text=True)
        self.assertEqual(result.returncode == 0, accepted)
        self.assertEqual((self.root / 'contacted').exists(), accepted)
        self.assertEqual(list(self.root.glob('yuashie-ssh.*')), [])
        self.assertNotIn(self.single_line, result.stdout + result.stderr)
        self.assertNotIn(self.raw.strip(), result.stdout + result.stderr)

    def test_multiline_key(self):
        self.run_key(self.raw, True)

    def test_windows_line_endings(self):
        self.run_key(self.raw.replace('\n', '\r\n'), True)

    def test_single_line_base64(self):
        self.run_key(self.single_line, True)

    def test_wrapped_base64(self):
        self.run_key('\r\n'.join(self.single_line[i:i+60] for i in range(0, len(self.single_line), 60)), True)

    def test_invalid_base64_never_connects(self):
        self.run_key('invalid <br/> text', False)

    def test_public_key_never_connects(self):
        self.run_key(self.key.with_suffix('.pub').read_text(), False)

    def test_base64_non_key_never_connects(self):
        self.run_key(base64.b64encode(b'not a private key').decode(), False)

    def test_raw_trusted_host_public_key(self):
        self.env['DEPLOY_KNOWN_HOSTS'] = self.host_public_key
        self.run_key(self.single_line, True)

    def test_host_public_key_with_surrounding_whitespace(self):
        self.env['DEPLOY_KNOWN_HOSTS'] = '\r\n  ' + self.host_public_key + '\r\n'
        self.run_key(self.single_line, True)

    def test_raw_host_key_with_custom_port(self):
        self.env['DEPLOY_KNOWN_HOSTS'] = self.host_public_key
        self.env['DEPLOY_PORT'] = '02222'
        self.run_key(self.single_line, True)

    def test_full_entry_custom_port(self):
        self.env['DEPLOY_KNOWN_HOSTS'] = '[example.com]:2222 ' + self.host_public_key
        self.env['DEPLOY_PORT'] = '2222'
        self.run_key(self.single_line, True)

    def test_other_hostname_is_not_silently_rebound(self):
        self.env['DEPLOY_KNOWN_HOSTS'] = 'different.example.com ' + self.host_public_key
        self.run_key(self.single_line, False)

    def test_wrong_port_never_connects(self):
        self.env['DEPLOY_PORT'] = '2222'
        self.run_key(self.single_line, False)

    def test_malformed_host_key_never_connects(self):
        self.env['DEPLOY_KNOWN_HOSTS'] = 'ssh-ed25519 not-a-key'
        self.run_key(self.single_line, False)


if __name__ == '__main__':
    unittest.main()
