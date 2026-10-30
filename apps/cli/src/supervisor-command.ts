import { join } from 'node:path';
import type { ChildCommand } from '@repo/process';

// How desktop and App E2E start a Supervisor: this package's `server` command, run as a service from the CLI's own directory.
export const supervisorCommand = (
  cliDirectory: string,
  env: NodeJS.ProcessEnv,
): ChildCommand => ({
  label: 'Supervisor',
  entry: join(cliDirectory, 'bin/argo.mjs'),
  args: ['server'],
  cwd: cliDirectory,
  env,
});

// Covers the Engine's 25 s stop grace in apps/server, which exports nothing (ADR-0016 §11), plus 5 s for its group release.
export const supervisorStopGraceMs = 35_000;
