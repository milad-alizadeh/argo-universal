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

it('applies input sent while the sign-in program is still starting once it starts', async () => {
  const { program, exited, started, launcher } = startingProgram();
  const terminal = new AuthTerminal(launcher);

  const run = terminal.run({
    launch,
    methodId: 'terminal',
    signal: new AbortController().signal,
  });

  terminal.input({ type: 'resize', cols: 100, rows: 30 });
  terminal.input({ type: 'write', text: '\r' });
  started.resolve(program);
  exited.resolve({ exitCode: 0 });
  await run;

  expect(program.resize).toHaveBeenCalledWith(100, 30);
  expect(program.write).toHaveBeenCalledWith('\r');
});
