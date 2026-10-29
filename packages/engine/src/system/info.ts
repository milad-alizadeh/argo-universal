import { execFileSync } from 'node:child_process';
import { hostname } from 'node:os';
import type { SystemInfo } from '@repo/contracts';

export type SystemDeps = Pick<SystemInfo, 'version' | 'startedAt'>;

// macOS keeps the name people gave the computer apart from its network host name.
function readComputerName(): string {
  return macComputerName() || hostname().replace(/\.local$/, '');
}

function macComputerName(): string | undefined {
  if (process.platform !== 'darwin') return undefined;

  try {
    return execFileSync('/usr/sbin/scutil', ['--get', 'ComputerName'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return undefined;
  }
}

let computerName: string | undefined;

export const readSystemInfo = (systemMetadata: SystemDeps): SystemInfo => {
  computerName ??= readComputerName();

  return {
    version: systemMetadata.version,
    startedAt: systemMetadata.startedAt,
    pid: process.pid,
    name: computerName,
  };
};
