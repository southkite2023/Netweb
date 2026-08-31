#!/usr/bin/env python3
"""Root-owned, forced-command SSH receiver. Deploys only static frontend files."""
import fcntl
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import signal
import subprocess
import sys
import tarfile
import tempfile
import time

APP = Path('/var/www/yuashie-app')
MAX_ARCHIVE = 32 * 1024 * 1024
MAX_EXPANDED = 100 * 1024 * 1024
MAX_FILES = 10000


def command_commit(command):
    match = re.fullmatch(r'deploy ([0-9a-f]{40})', command)
    if not match:
        raise ValueError('Only a frontend deployment is allowed with this key.')
    return match.group(1)


def unpack(payload, destination, commit):
    if not payload or len(payload) > MAX_ARCHIVE:
        raise ValueError('Empty or oversized archive.')
    total, seen = 0, set()
    with tarfile.open(fileobj=io.BytesIO(payload), mode='r:gz') as archive:
        for count, member in enumerate(archive, 1):
            if count > MAX_FILES:
                raise ValueError('Too many archive entries.')
            raw = member.name
            if raw in ('.', './') and member.isdir():
                continue
            if raw.startswith('./'):
                raw = raw[2:]
            path = PurePosixPath(raw)
            if (not raw or path.is_absolute() or '..' in path.parts
                    or any(part.startswith('.') for part in path.parts)
                    or not re.fullmatch(r'[A-Za-z0-9_/.,@+ -]+', raw)
                    or not (member.isfile() or member.isdir())
                    or member.sparse is not None
                    or member.size < 0):
                raise ValueError('Unsafe archive entry.')
            if len(path.parts) > 1 and path.parts[0] != 'assets':
                raise ValueError('Only root static files and assets/ are allowed.')
            if path.parts[0] in {'server', 'user-content', 'backups', 'node_modules', 'scripts'}:
                raise ValueError('Non-frontend path rejected.')
            if path.suffix.lower() in {'.pem', '.key', '.db', '.sqlite', '.sqlite3', '.sql', '.sh', '.py'}:
                raise ValueError('Non-frontend file rejected.')
            if path in seen:
                raise ValueError('Duplicate archive path.')
            seen.add(path)
            target = destination.joinpath(*path.parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            total += member.size
            if total > MAX_EXPANDED:
                raise ValueError('Expanded archive is too large.')
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.extractfile(member) as source, target.open('xb') as output:
                shutil.copyfileobj(source, output)
            target.chmod(0o644)
    if not (destination / 'index.html').is_file() or not (destination / 'index.html').stat().st_size:
        raise ValueError('index.html missing or empty.')
    version = json.loads((destination / 'deploy-version.json').read_text())
    if version.get('commit') != commit:
        raise ValueError('Archive commit does not match requested commit.')
    for directory, _, _ in os.walk(destination):
        Path(directory).chmod(0o755)


def health(commit):
    # Check Nginx on this server using the existing HTTPS certificate and vhost.
    base = ['curl', '--fail', '--silent', '--show-error', '--noproxy', '*',
            '--connect-timeout', '5', '--max-time', '15',
            '--resolve', 'yuashie.cn:443:127.0.0.1']
    subprocess.run(base + ['--output', '/dev/null', 'https://yuashie.cn/'], check=True)
    response = subprocess.run(base + [f'https://yuashie.cn/deploy-version.json?commit={commit}'],
                              check=True, capture_output=True, text=True)
    if json.loads(response.stdout).get('commit') != commit:
        raise RuntimeError('Nginx did not serve the expected frontend version.')


def install(payload, commit, app=APP, check=health):
    dist = app / 'dist'
    if app.is_symlink() or not app.is_dir() or dist.is_symlink() or not (dist / 'index.html').is_file():
        raise ValueError('Expected an existing real dist directory; no server changes made.')
    if shutil.disk_usage(app).free < 2 * MAX_EXPANDED:
        raise ValueError('At least 200 MiB free disk space is required.')
    backups = app / 'backups' / 'github-frontend'
    if (app / 'backups').is_symlink() or backups.is_symlink():
        raise ValueError('Backup directory must not be a symlink.')
    backups.mkdir(parents=True, exist_ok=True)
    backups.chmod(0o700)
    # Staging and backups stay on the existing app filesystem.
    with tempfile.TemporaryDirectory(prefix='.github-stage-', dir=app) as temp:
        stage = Path(temp) / 'dist'
        stage.mkdir()
        unpack(payload, stage, commit)
        backup = backups / f'{time.time_ns()}-{commit[:12]}'
        moved_old = False
        try:
            dist.rename(backup)
            moved_old = True
            stage.rename(dist)
            check(commit)
        except BaseException:
            if moved_old:
                if dist.exists():
                    dist.rename(Path(temp) / 'failed-dist')
                backup.rename(dist)
                print('Deployment failed; previous frontend restored.', file=sys.stderr)
            raise
    print(f'Frontend deployed: {commit}. Backup: {backup}')


def interrupted(signum, frame):
    raise RuntimeError('Deployment interrupted.')


def main():
    if os.geteuid() != 0:
        raise ValueError('Receiver must run through the installed dedicated SSH key.')
    os.umask(0o022)
    commit = command_commit(os.environ.get('SSH_ORIGINAL_COMMAND', ''))
    for signum in (signal.SIGTERM, signal.SIGHUP, signal.SIGINT):
        signal.signal(signum, interrupted)
    with open('/run/lock/yuashie-github-frontend.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        payload = sys.stdin.buffer.read(MAX_ARCHIVE + 1)
        install(payload, commit)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Frontend deployment stopped: {error}', file=sys.stderr)
        sys.exit(1)
