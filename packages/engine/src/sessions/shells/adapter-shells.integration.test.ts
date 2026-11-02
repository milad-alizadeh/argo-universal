import { shell } from '@repo/db/schema';
import { expect, it, vi } from 'vitest';
import { reportedCommand, reportedEnd } from '#mocks/acp-terminal-output';
import { sender } from '#mocks/adapter-shells';
import { openMemoryShells } from '#mocks/memory-shells';

const cwd = '/project';

const call = 'toolu-1';

const command = 'pnpm verify';

const background = { command, run_in_background: true };

it('records a command the Agent ran in the background as a running Shell in its Checkout', async (): Promise<void> => {
  const { notify, changes } = openMemoryShells();

  sender(notify)(reportedCommand(call, background));

  await vi.waitFor(() =>
    expect(changes).toMatchObject([
      { id: call, toolCallId: call, command, cwd, status: 'running' },
    ]),
  );
});

it('ends that Shell when the Agent reports the command finished, with no code when nothing says one', async (): Promise<void> => {
  const { notify, changes, database } = openMemoryShells();
  const send = sender(notify);
  send(reportedCommand(call, background));
  await vi.waitFor(() => expect(changes).toHaveLength(1));

  send([reportedEnd(call)]);

  await vi.waitFor(() =>
    expect(changes.at(-1)).toMatchObject({ status: 'exited', exitCode: null }),
  );
  expect(database.select().from(shell).all()).toMatchObject([
    { id: call, status: 'exited' },
  ]);
});

it('records the Shell once when the Agent repeats the command, and cannot stop it', async (): Promise<void> => {
  const { notify, changes, shells } = openMemoryShells();
  const send = sender(notify);

  send(reportedCommand(call, background));
  send(reportedCommand(call, background));
  await vi.waitFor(() => expect(changes.length).toBeGreaterThan(0));

  expect(new Set(changes.map(({ id }) => id))).toEqual(new Set([call]));
  expect(shells.canStop(call)).toBe(false);
});

it('does not reopen an ended Shell when the Agent reports its command again', async (): Promise<void> => {
  const { notify, changes } = openMemoryShells();
  const send = sender(notify);
  send(reportedCommand(call, background));
  send([reportedEnd(call)]);
  await vi.waitFor(() =>
    expect(changes.at(-1)).toMatchObject({ status: 'exited' }),
  );

  send(reportedCommand(call, background));
  await new Promise((resolve) => setTimeout(resolve, 20));

  expect(changes.at(-1)).toMatchObject({ status: 'exited' });
});

it('keeps a late end from the Feed, which has settled that Turn, but not a foreground end', async (): Promise<void> => {
  const { notify, forwarded, changes } = openMemoryShells();
  const send = sender(notify);
  send(reportedCommand(call, background));
  send(reportedCommand('toolu-2', { command: 'ls' }));
  const before = forwarded.length;

  send([reportedEnd(call), reportedEnd('toolu-2')]);

  expect(forwarded.slice(before).map(({ update }) => update)).toMatchObject([
    { toolCallId: 'toolu-2' },
  ]);
  await vi.waitFor(() =>
    expect(changes.at(-1)).toMatchObject({ status: 'exited' }),
  );
});
