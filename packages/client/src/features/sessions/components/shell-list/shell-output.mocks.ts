import type { ShellOutputText } from './shell-list-types';
import {
  failedShell,
  lostShell,
  noCodeShell,
  passedShell,
  runningShell,
  stoppedShell,
} from './shell-list.mocks';

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
const devStart = [
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
];

// The newest lines, as Paper's running Shell ends.
const devLatest = [
  `${muted('› ')}Reloading apps`,
  `${bundled}${muted('96ms ')}index.ts ${muted('(1 module)')}`,
  `${muted('LOG   ')}${done('[feed] ')}subscribe revision ${warning('42')}`,
  `${muted('LOG   ')}${done('[feed] ')}page after:${warning('41')} → ${warning('12')} rows`,
];

// Earlier revisions between start and the newest lines, so the output scrolls on a phone.
const devReloads = Array.from(
  { length: 24 },
  (_, index) =>
    `${muted('LOG   ')}${done('[feed] ')}subscribe revision ${warning(String(18 + index))}`,
);

const outputText = (lines: string[]): string => `${lines.join('\n')}\n`;

export const runningOutput: ShellOutputText = {
  shellId: runningShell.id,
  text: outputText([...devStart, ...devLatest]),
};

export const longRunningOutput: ShellOutputText = {
  shellId: runningShell.id,
  text: outputText([...devStart, ...devReloads, ...devLatest]),
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

// Paper draws the ended states over the same short output, cut short from the top.
const shortOutput = [
  `@storybook/cli ${muted('v9.1.0')}`,
  `${info('info ')}Using Vite builder`,
].join('\n');

const keptOutput = (shellId: string): ShellOutputText => ({
  shellId,
  text: shortOutput,
  droppedLines: 312,
});

export const stoppedOutput = keptOutput(stoppedShell.id);

export const noCodeOutput = keptOutput(noCodeShell.id);

export const lostOutput = keptOutput(lostShell.id);

// A test run piped through tee, which drops the colours, so the light marks draw it instead.
export const uncolouredOutput: ShellOutputText = {
  shellId: passedShell.id,
  text: outputText([
    ' RUN  v3.2.4 /Users/you/argo',
    ' ✓ src/feed.test.ts (12 tests) 48ms',
    ' ✓ src/session.test.ts (9 tests) 31ms',
    'warning: --reporter=basic is deprecated, see https://vitest.dev/guide/reporters',
    'Error: expected 2 calls, received 1',
    '    at ./src/composer.test.ts:88:14',
    ' Test Files  1 failed | 2 passed (3)',
    '      Tests  0 errors in ~/argo/packages/client',
  ]),
};
