import type { RunConfigurationRow } from '@repo/contracts';

const webPort = 3100;

const web: RunConfigurationRow = {
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

export const workbenchRuns = [web, docs];

export const stoppedRuns = [
  { ...docs },
  { ...docs, name: web.name, command: web.command },
];

export const startingRuns = [
  { ...web, status: 'starting' },
  docs,
] satisfies RunConfigurationRow[];

export const crashedRuns = [
  { ...web, status: 'crashed', exitCode: 1 },
  docs,
] satisfies RunConfigurationRow[];

export const workbenchRunTime = 1_700_000_012_000;
