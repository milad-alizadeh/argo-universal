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

// A stopping Supervisor gives its Engine 25 s and the Engine's group 5 s to go; only past that is the Supervisor's own group killed.
export const supervisorStopGraceMs = 35_000;
