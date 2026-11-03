export function validatedLinuxPackages(manifest) {
  const items = manifest.linuxPackages || []
  if (!Array.isArray(items)) throw Error('Invalid Linux inventory')
  return items.map(item => {
    if (item.platform !== 'linux' || !['x86_64', 'aarch64'].includes(item.architecture) ||
        !['deb', 'rpm', 'AppImage', 'tar.gz'].includes(item.format) || !/^\d+\.\d+\.\d+$/.test(item.version) ||
        item.file !== `Astracct-Linux-${item.version}-${item.architecture}.${item.format}` ||
        item.url !== `https://yuashie.cn/downloads/astracct/v${item.version}/${item.file}` ||
        !Number.isSafeInteger(item.bytes) || item.bytes <= 0 || item.bytes > 512 * 1024 * 1024 ||
        !/^[a-f0-9]{64}$/.test(item.sha256)) throw Error('Invalid Linux package')
    return { ...item }
  })
}
