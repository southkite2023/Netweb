#!/usr/bin/env python3
"""Mirror verified public release assets, then atomically advertise per-platform latest.
Run as a dedicated unprivileged user; no GitHub/deployment credentials required.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import urllib.request

REPO = 'southkite2023/quota-hub'
PATTERN = re.compile(r'^(?:quota-hub|astracct)-(\d+\.\d+\.\d+)-(android|universal|arm64-v8a|armeabi-v7a|x86_64|windows-x64|macos-universal)\.(apk|zip|dmg)$')
MAX_SIZE = 512 * 1024 * 1024

def request(url, binary=False):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Yuashie-release-mirror/1', 'Accept': 'application/octet-stream' if binary else 'application/vnd.github+json'}), timeout=60)

def select(releases):
    selected = {}
    # Prereleases are included deliberately: Astracct's public channel is labelled testing.
    for release in releases:
        if release['draft']:
            continue
        for asset in release['assets']:
            match = PATTERN.fullmatch(asset['name'])
            if not match or release['tag_name'] != 'v' + match[1]:
                continue
            version, variant, extension = match.groups()
            platform = 'windows' if variant == 'windows-x64' else 'macos' if variant == 'macos-universal' else 'android'
            if extension not in (('apk',) if platform == 'android' else ('zip', 'dmg') if platform == 'macos' else ('zip',)):
                continue
            arch = 'universal' if variant == 'android' else variant
            if extension == 'dmg': arch += '-dmg'
            key = platform + ':' + arch
            digest = asset.get('digest') or ''
            if not re.fullmatch(r'sha256:[a-f0-9]{64}', digest) or not 0 < asset['size'] <= MAX_SIZE:
                raise ValueError('Missing trusted digest or invalid size: ' + asset['name'])
            if key not in selected or tuple(map(int, version.split('.'))) > tuple(map(int, selected[key]['version'].split('.'))):
                selected[key] = {'platform': platform, 'architecture': arch, 'version': version,
                    'file': asset['name'], 'bytes': asset['size'], 'sha256': digest[7:],
                    'source': asset['browser_download_url'], '_download': f"https://api.github.com/repos/{REPO}/releases/assets/{int(asset['id'])}?mirror={digest[7:23]}", 'releaseUrl': release['html_url'],
                    'notes': (release.get('body') or '')[:6000], 'prerelease': release['prerelease']}
    # Never combine old ABI assets with a newer Android universal release.
    android = [p['version'] for p in selected.values() if p['platform'] == 'android']
    latest_android = max(android, key=lambda v: tuple(map(int, v.split('.')))) if android else None
    return [p for p in selected.values() if p['platform'] != 'android' or p['version'] == latest_android]

def digest_file(path):
    with path.open('rb') as stream:
        digest = hashlib.sha256()
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
        return digest.hexdigest()

def sync(root):
    root.mkdir(parents=True, exist_ok=True)
    releases = []
    for page in range(1, 11):
        with request(f'https://api.github.com/repos/{REPO}/releases?per_page=100&page={page}') as response:
            batch = json.load(response)
        releases.extend(batch)
        if len(batch) < 100:
            break
    packages = select(releases)
    if not all(any(p['platform'] == platform for p in packages) for platform in ('android', 'windows', 'macos')):
        raise ValueError('Incomplete release inventory; keeping previous manifest')
    for item in packages:
        download_url = item.pop('_download')
        directory = root / ('v' + item['version'])
        directory.mkdir(exist_ok=True)
        target = directory / item['file']
        if not target.exists() or target.stat().st_size != item['bytes'] or digest_file(target) != item['sha256']:
            # Do not mutate a previously published URL's bytes.
            if target.exists():
                raise ValueError('Existing mirror differs from upstream: ' + str(target))
            fd, temporary = tempfile.mkstemp(dir=directory, prefix='.download-')
            try:
                with os.fdopen(fd, 'wb') as output, request(download_url, binary=True) as response:
                    count = 0
                    while chunk := response.read(1024 * 1024):
                        count += len(chunk)
                        if count > item['bytes']:
                            raise ValueError('Download exceeds declared size')
                        output.write(chunk)
                path = Path(temporary)
                if path.stat().st_size != item['bytes'] or digest_file(path) != item['sha256']:
                    raise ValueError('Checksum mismatch: ' + item['file'])
                path.chmod(0o644)
                os.replace(path, target)
            finally:
                Path(temporary).unlink(missing_ok=True)
        item['url'] = 'https://yuashie.cn/downloads/astracct/v' + item['version'] + '/' + item['file']
    manifest = {'schema': 1, 'channel': 'public-testing', 'packages': [item for item in packages if not item['file'].endswith('.dmg')]}
    fd, temporary = tempfile.mkstemp(dir=root, prefix='.manifest-')
    try:
        with os.fdopen(fd, 'w') as output:
            json.dump(manifest, output, ensure_ascii=False, indent=2)
            output.write('\n')
        os.chmod(temporary, 0o644)
        os.replace(temporary, root / 'latest.json')
    finally:
        Path(temporary).unlink(missing_ok=True)
    print('Verified and mirrored', len(packages), 'packages')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('root', type=Path)
    sync(parser.parse_args().root)
