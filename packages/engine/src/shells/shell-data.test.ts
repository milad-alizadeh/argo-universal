import type { TerminalExitStatus } from '@agentclientprotocol/sdk';
import { Shell } from '@repo/contracts';
import { runningShellStep } from '@repo/mocks/agent/shell-scenarios';
import { expect, it } from 'vitest';
import { shellFromTerminal, shellWithExit, toShell } from './shell-data';

const origin = {
  sessionId: 'session-1',
  toolCallId: runningShellStep.toolCallId,
  cwd: '/project',
  startedAt: 100,
};

const terminal = { type: 'terminal', terminalId: 'terminal-1' } as const;

const createShell = (): ReturnType<typeof shellFromTerminal> =>
  shellFromTerminal(
    { ...runningShellStep.request, sessionId: 'acp-session' },
    terminal,
    origin,
  );

it('maps the ACP resource identity and launch data without interpreting the command', () => {
  const shell = shellFromTerminal(
    {
      sessionId: 'acp-session',
      command: 'echo',
      args: ["it's $HOME"],
      cwd: '/other',
    },
    terminal,
    origin,
  );

  expect(shell).toMatchObject({
    id: 'terminal-1',
    sessionId: 'session-1',
    toolCallId: 'background-command',
    command: "'echo' 'it'\\''s $HOME'",
    cwd: '/other',
    status: 'running',
    exitCode: null,
    endedAt: null,
  });
});

it('keeps a Shell running until terminal exit and gates Stop on terminal ownership', () => {
  const shell = createShell();
  expect(toShell(shell, { now: 200, terminalAvailable: true })).toMatchObject({
    status: 'running',
    endedAt: null,
    durationMs: 100,
    cwd: '/project',
    canStop: true,
  });
  expect(toShell(shell, { now: 300, terminalAvailable: false })).toMatchObject({
    status: 'running',
    endedAt: null,
    durationMs: 200,
    canStop: false,
  });
});

type ExitCase = {
  name: string;
  status: TerminalExitStatus;
  stopped: boolean;
  expectedStatus: Shell['status'];
  exitCode: number | null;
};

const exits: ExitCase[] = [
  {
    name: 'success',
    status: { exitCode: 0 },
    stopped: false,
    expectedStatus: 'exited',
    exitCode: 0,
  },
  {
    name: 'failure',
    status: { exitCode: 7 },
    stopped: false,
    expectedStatus: 'exited',
    exitCode: 7,
  },
  {
    name: 'no exit code',
    status: {},
    stopped: false,
    expectedStatus: 'exited',
    exitCode: null,
  },
  {
    name: 'signal',
    status: { exitCode: null, signal: 'SIGTERM' },
    stopped: false,
    expectedStatus: 'exited',
    exitCode: null,
  },
  {
    name: 'user Stop',
    status: { signal: 'SIGTERM' },
    stopped: true,
    expectedStatus: 'stopped',
    exitCode: null,
  },
];

it.each(exits)(
  'maps $name without inventing an exit code',
  ({ status, stopped, expectedStatus, exitCode }) => {
    const shell = shellWithExit(createShell(), {
      status,
      stopped,
      endedAt: 200,
    });

    const result = toShell(shell, { now: 300, terminalAvailable: true });
    expect(Shell.parse(result)).toMatchObject({
      status: expectedStatus,
      exitCode,
      endedAt: 200,
      durationMs: 100,
      canStop: false,
    });
    expect(result).not.toHaveProperty('outputBlobId');
  },
);

it('never offers Stop for a lost Shell even if a terminal service is available', () => {
  const shell = { ...createShell(), status: 'lost', endedAt: 200 } as const;
  expect(toShell(shell, { now: 300, terminalAvailable: true })).toMatchObject({
    status: 'lost',
    canStop: false,
    durationMs: 100,
  });
});
