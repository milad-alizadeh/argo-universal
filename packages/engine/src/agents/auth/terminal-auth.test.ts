import { expect, it, vi } from 'vitest';
import type { AgentLaunch, LoginTerminalProcess } from '../agent-launch';
import { AuthTerminal } from './terminal-auth';

const launch: AgentLaunch = {
  projectId: 'project',
  agentId: 'agent',
  executable: 'agent',
  version: '1.0.0',
  args: [],
  cwd: '/',
  env: {},
  authContext: 'context',
};

type StartingProgram = {
  program: LoginTerminalProcess;
  exited: PromiseWithResolvers<{ exitCode: number }>;
  started: PromiseWithResolvers<LoginTerminalProcess>;
  launcher: () => Promise<LoginTerminalProcess>;
};

const startingProgram = (): StartingProgram => {
  const exited = Promise.withResolvers<{ exitCode: number }>();

  const program = {
    exited: exited.promise,
    write: vi.fn<LoginTerminalProcess['write']>(),
    resize: vi.fn<LoginTerminalProcess['resize']>(),
    close: vi.fn<LoginTerminalProcess['close']>(async () =>
      exited.resolve({ exitCode: 0 }),
    ),
  };

  const started = Promise.withResolvers<LoginTerminalProcess>();

  return {
    program,
    exited,
    started,
    launcher: (): Promise<LoginTerminalProcess> => started.promise,
  };
};

const terminalRun = {
  launch,
  methodId: 'terminal',
  signal: new AbortController().signal,
};

it('applies input sent while the sign-in program is still starting, in the order it was sent', async () => {
  const { program, exited, started, launcher } = startingProgram();
  const terminal = new AuthTerminal(launcher);

  const run = terminal.run(terminalRun);

  terminal.input({ type: 'write', text: 'a' });
  terminal.input({ type: 'resize', cols: 100, rows: 30 });
  terminal.input({ type: 'write', text: '\r' });
  started.resolve(program);
  exited.resolve({ exitCode: 0 });
  await run;

  expect(vi.mocked(program.write).mock.calls).toEqual([['a'], ['\r']]);
  expect(program.resize).toHaveBeenCalledWith(100, 30);
  expect(vi.mocked(program.write).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(program.resize).mock.invocationCallOrder[0] ?? 0,
  );
  expect(vi.mocked(program.resize).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(program.write).mock.invocationCallOrder[1] ?? 0,
  );
});

it('drops input sent while the sign-in program starts when it fails to start, and reports the launch failure', async () => {
  const { program, started, launcher } = startingProgram();
  const terminal = new AuthTerminal(launcher);

  const run = terminal.run(terminalRun);

  terminal.input({ type: 'write', text: '\r' });
  started.reject(new Error('Launch failed'));

  await expect(run).rejects.toThrow('Launch failed');
  expect(program.write).not.toHaveBeenCalled();
});
