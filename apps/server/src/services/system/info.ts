import { execFileSync } from 'node:child_process';
import { hostname } from 'node:os';
import type { SystemInfo } from '@repo/contracts';

export interface SystemDeps {
  version: string;
  startedAt: string;
}

// macOS keeps the name people gave the computer apart from its network host name.
function readComputerName() {
  if (process.platform === 'darwin') {
    try {
      const name = execFileSync('scutil', ['--get', 'ComputerName'], {
        encoding: 'utf8',
      }).trim();
      if (name) return name;
    } catch {}
  }
  return hostname().replace(/\.local$/, '');
}

let computerName: string | undefined;

export const info = (deps: SystemDeps): SystemInfo => {
  computerName ??= readComputerName();
  return {
    version: deps.version,
    startedAt: deps.startedAt,
    pid: process.pid,
    name: computerName,
  };
};
