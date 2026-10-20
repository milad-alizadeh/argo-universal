import type { ShellEntry, ShellOutputText } from './shell-list-types';

// Paper "Components / Shell": one running dev server, a passed and a failed run.
export const shellNow = Date.UTC(2026, 9, 20, 12, 0, 0);

const repoRoot = '~/argo-universal';

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
  command: 'pnpm storybook',
  cwd: repoRoot,
  status: 'exited',
  exitCode: 1,
  startedAt: shellNow - 6 * minute,
  endedAt: shellNow - 6 * minute + 8 * second,
  durationMs: 8 * second,
};

export const sessionShells: ShellEntry[] = [
  runningShell,
  passedShell,
  failedShell,
];

const escape = String.fromCodePoint(0x1b);

const colour =
  (code: number) =>
  (text: string): string =>
    `${escape}[${code}m${text}${escape}[0m`;

const muted = colour(90);

const danger = colour(31);

const success = colour(32);

const warning = colour(33);

const info = colour(34);

const done = colour(35);

const bundled = success('Web Bundled ');

// What Expo prints while it serves the app, with its own colours.
const devOutput = [
  muted('> @argo/app@0.1.0 dev'),
  muted('> expo start --web'),
  '',
  `${muted('env: ')}load .env.local`,
  muted('Starting Metro Bundler'),
  `${muted('› ')}Metro waiting on ${info('exp://192.168.1.20:8081')}`,
  `${muted('› ')}Web is waiting on ${info('http://localhost:8081')}`,
  '',
  `${bundled}${muted('1832ms ')}index.ts ${muted('(1204 modules)')}`,
  `${muted('LOG   ')}${done('[tRPC] ')}connected to ${info('ws://localhost:4310')}`,
  `${bundled}${muted('214ms ')}index.ts ${muted('(1 module)')}`,
  `${warning('WARN  ')}Route ${info('"./session/[id].tsx"')} has no default`,
  `${muted('› ')}Reloading apps`,
  `${bundled}${muted('96ms ')}index.ts ${muted('(1 module)')}`,
  `${muted('LOG   ')}${done('[feed] ')}subscribe revision ${warning('42')}`,
  `${muted('LOG   ')}${done('[feed] ')}page after:${warning('41')} → ${warning('12')} rows`,
].join('\n');

// More of the same, so the output scrolls on a phone.
const devReloads = Array.from(
  { length: 24 },
  (_, index) =>
    `${muted('LOG   ')}${done('[feed] ')}subscribe revision ${warning(String(43 + index))}`,
).join('\n');

export const runningOutput: ShellOutputText = {
  shellId: runningShell.id,
  text: `${devOutput}\n`,
};

export const longRunningOutput: ShellOutputText = {
  shellId: runningShell.id,
  text: `${devOutput}\n${devReloads}\n`,
};

export const failedOutput: ShellOutputText = {
  shellId: failedShell.id,
  text: [
    `@storybook/cli ${muted('v9.1.0')}`,
    `${info('info ')}Using Vite builder`,
    `${danger('Error: Port ')}${warning('6006')}${danger(' is already in use.')}`,
    `${muted('    at checkPort (')}server.js:212:11${muted(')')}`,
    `${danger('ELIFECYCLE  ')}Command failed with exit code ${warning('1')}.`,
  ].join('\n'),
  droppedLines: 312,
};
