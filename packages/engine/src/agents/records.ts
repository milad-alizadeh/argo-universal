export function resolveRegistryServerPlatform(): string {
  const os = process.platform === 'win32' ? 'windows' : process.platform;

  return `${os}-${resolveRegistryServerArchitecture()}`;
}

function resolveRegistryServerArchitecture(): string {
  if (process.arch === 'arm64') return 'aarch64';

  return process.arch === 'x64' ? 'x86_64' : process.arch;
}
