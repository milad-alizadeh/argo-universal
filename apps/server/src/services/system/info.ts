import type { SystemInfo } from '@repo/contracts';

export interface SystemDeps {
  version: string;
  startedAt: string;
}

export const info = (deps: SystemDeps): SystemInfo => ({
  version: deps.version,
  startedAt: deps.startedAt,
  pid: process.pid,
});
