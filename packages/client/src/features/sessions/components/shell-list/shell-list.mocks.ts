import type { ShellEntry } from './shell-list-types';

// Paper "Components / Shell": one running dev server, a passed and a failed run.
export const shellNow = Date.UTC(2026, 9, 20, 12, 0, 0);

const repoRoot = '~/argo-universal';

const storybook = 'pnpm storybook';

const minute = 60_000;

const second = 1000;

const shellBase = {
  sessionId: 'session-shells',
  canStop: false,
  endedAt: null,
  exitCode: null,
} as const;

export const runningShell: ShellEntry = {
  ...shellBase,
  id: 'shell-dev',
  toolCallId: 'tool-dev',
  command: 'pnpm dev',
  cwd: '~/argo-universal/apps/app',
  status: 'running',
  startedAt: shellNow - 4 * minute - 12 * second,
  durationMs: 4 * minute + 12 * second,
  canStop: true,
  lastLine: 'ready on localhost:8081',
};

export const passedShell: ShellEntry = {
  ...shellBase,
  id: 'shell-e2e',
  toolCallId: 'tool-e2e',
  command: 'pnpm e2e',
  cwd: repoRoot,
  status: 'exited',
  exitCode: 0,
  startedAt: shellNow - 10 * minute,
  endedAt: shellNow - 8 * minute,
  durationMs: minute + 47 * second,
};

export const failedShell: ShellEntry = {
  ...shellBase,
  id: 'shell-storybook',
  toolCallId: 'tool-storybook',
  command: storybook,
  cwd: repoRoot,
  status: 'exited',
  exitCode: 1,
  startedAt: shellNow - 6 * minute,
  endedAt: shellNow - 6 * minute + 8 * second,
  durationMs: 8 * second,
};

// Paper "Row / Shell stopped": you or the Agent killed it, so there is no exit code to report.
export const stoppedShell: ShellEntry = {
  ...shellBase,
  id: 'shell-stopped',
  toolCallId: 'tool-stopped',
  command: storybook,
  cwd: repoRoot,
  status: 'stopped',
  startedAt: shellNow - 5 * minute,
  endedAt: shellNow - 2 * minute - 46 * second,
  durationMs: 2 * minute + 14 * second,
};

// Paper "Row / Shell exited, no code": the Agent reported an exit the Server could not put a code to.
export const noCodeShell: ShellEntry = {
  ...shellBase,
  id: 'shell-no-code',
  toolCallId: 'tool-no-code',
  command: storybook,
  cwd: repoRoot,
  status: 'exited',
  startedAt: shellNow - 3 * minute,
  endedAt: shellNow - 3 * minute + 8 * second,
  durationMs: 8 * second,
};

// Paper "Row / Shell lost": the Server restarted mid-run, so its process is gone and only the output is kept.
export const lostShell: ShellEntry = {
  ...shellBase,
  id: 'shell-lost',
  toolCallId: 'tool-lost',
  command: storybook,
  cwd: repoRoot,
  status: 'lost',
  startedAt: shellNow - 12 * minute,
  endedAt: shellNow - 9 * minute,
  durationMs: 3 * minute,
};

export const sessionShells: ShellEntry[] = [
  runningShell,
  passedShell,
  failedShell,
];

// Every way a Shell can end, as the wide panel's list draws them.
export const endedShells: ShellEntry[] = [
  passedShell,
  failedShell,
  stoppedShell,
  noCodeShell,
  lostShell,
];
