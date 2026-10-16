import type { AuthMethodTerminal } from '@agentclientprotocol/sdk';
import { scriptedInitialization } from './scripted-scenario.ts';

const terminalMethod: AuthMethodTerminal & { type: 'terminal' } = {
  type: 'terminal',
  id: 'interactive-subscription',
  name: 'Terminal sign-in',
  args: ['--interactive-login'],
};

export const terminalLogin = {
  initialize: { ...scriptedInitialization, authMethods: [terminalMethod] },
};

export const runTerminalLoginMock = (): void => {
  const mode = modes.find(([flag]) => process.argv.includes(flag));

  (mode?.[1] ?? runInteractiveLogin)();
};

// A sign-in program that ignores hangup and termination: only the process group's escalation stops it.
const ignoreHangup = (): void => {
  for (const signal of ['SIGHUP', 'SIGTERM', 'SIGINT'] as const)
    process.on(signal, () => {});
  process.stdout.write(`pid ${process.pid}\r\n`);
};

const runInteractiveLogin = (): void => {
  process.stdin.setRawMode(true);
  process.stdout.write(
    'Sign in with your subscription.\r\n\r\n› Continue in your browser\r\n  Cancel\r\n\r\nUse ↑ / ↓ then Enter.\r\n',
  );
  process.stdin.on('data', (input: Buffer) => {
    if (input.includes(13)) process.exit(0);
  });
};

const writeAuthPattern = (): void => {
  process.stdout.write(
    `${process.argv.at(-1)}\r\n${process.env.ARGO_AUTH_VALUE ?? ''}\r\n`,
  );
  process.stdin.resume();
};

const modes: [flag: string, run: () => void][] = [
  ['--auth-fail', () => process.exit(7)],
  ['--auth-pattern', writeAuthPattern],
  [
    '--ignore-hangup',
    () => {
      ignoreHangup();
      runInteractiveLogin();
    },
  ],
];
