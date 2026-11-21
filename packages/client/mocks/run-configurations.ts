import type { RunConfigurationRow } from '@repo/contracts';

const webPort = 3100;

export const webRun: RunConfigurationRow = {
  name: 'web',
  command: 'pnpm web',
  status: 'ready',
  port: webPort,
  url: `http://localhost:${webPort}`,
  exitCode: null,
  startedAt: 1_700_000_000_000,
};

const docs: RunConfigurationRow = {
  name: 'docs',
  command: 'pnpm docs',
  status: 'stopped',
  port: null,
  url: null,
  exitCode: null,
  startedAt: null,
};

export const workbenchRuns = [webRun, docs];

export const stoppedRuns = [
  { ...docs },
  { ...docs, name: webRun.name, command: webRun.command },
];

export const startingRuns = [
  { ...webRun, status: 'starting' },
  docs,
] satisfies RunConfigurationRow[];

export const crashedRuns = [
  { ...webRun, status: 'crashed', exitCode: 1 },
  docs,
] satisfies RunConfigurationRow[];

export const workbenchRunTime = 1_700_000_012_000;
