import { shell } from '@repo/db/schema';
import { expect, it, vi } from 'vitest';
import { openMemoryShells } from '#mocks/memory-shells';

const first = 'terminal-1';

const terminalOne = { terminalId: first };

const create = 'terminal/create';

const running = 'tool-1';

it('keeps a created Shell unstored until a Tool call claims its terminal', async (): Promise<void> => {
  const { terminal, claim, changes, commands } = openMemoryShells();

  const created = await terminal(create, { command: 'echo' });

  expect(created).toMatchObject({ result: { terminalId: first } });
  expect(commands[0]?.input.request.command).toBe('echo');
  expect(changes).toEqual([]);

  claim(first, running);
  await vi.waitFor(() =>
    expect(changes).toMatchObject([
      { id: first, toolCallId: running, status: 'running' },
    ]),
  );
});

it('ends a Shell with its exit code and keeps its output for the Agent to read', async (): Promise<void> => {
  const { terminal, claim, changes, commands, database } = openMemoryShells();
  await terminal(create, { command: 'make' });
  claim(first, running);

  await commands[0]?.print('built\n');
  commands[0]?.exit(2);
  await terminal('terminal/wait_for_exit', terminalOne);

  await expect(terminal('terminal/output', terminalOne)).resolves.toMatchObject(
    { result: { output: 'built\n', exitStatus: { exitCode: 2 } } },
  );
  await vi.waitFor(() =>
    expect(changes.at(-1)).toMatchObject({ status: 'exited', exitCode: 2 }),
  );
  expect(database.select().from(shell).all()).toMatchObject([
    { id: first, status: 'exited', exitCode: 2 },
  ]);
});

it('stops a running Shell on request and then reports it neither stoppable nor known', async (): Promise<void> => {
  const { shells, terminal, claim, changes, commands } = openMemoryShells();
  await terminal(create, { command: 'sleep' });
  claim(first, running);

  expect(shells.canStop(first)).toBe(true);
  shells.stop(first);
  await commands[0]?.exited;

  await vi.waitFor(() =>
    expect(changes.at(-1)).toMatchObject({ status: 'stopped' }),
  );
  expect(shells.canStop(first)).toBe(false);
  expect(shells.canStop('unknown')).toBe(false);
  expect(() => shells.stop('unknown')).toThrow('Unknown ACP terminal');
});

it('records the running Shells as lost on close, and refuses terminals after it', async (): Promise<void> => {
  const { shells, terminal, claim, changes } = openMemoryShells();
  await terminal(create, { command: 'sleep' });
  claim(first, running);
  await vi.waitFor(() => expect(changes).toHaveLength(1));

  await shells.close('lost');

  await vi.waitFor(() =>
    expect(changes.at(-1)).toMatchObject({ status: 'lost' }),
  );
  await expect(terminal(create, { command: 'echo' })).resolves.toMatchObject({
    error: {},
  });
});

it('ignores a Tool call that names no terminal of its own', async (): Promise<void> => {
  const { terminal, claim, changes } = openMemoryShells();
  await terminal(create, { command: 'echo' });

  claim('another-terminal', 'tool-2');

  expect(changes).toEqual([]);
});
