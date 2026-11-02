import type { SessionNotification } from '@agentclientprotocol/sdk';
import { shell } from '@repo/db/schema';
import { expect, it, vi } from 'vitest';
import { openMemoryShells } from '#mocks/memory-shells';

const call = 'toolu-1';

const cwd = '/project';

const command = 'pnpm verify';

type Input = { command: string; run_in_background?: true };

const toolCall = 'tool_call';

const started = (rawInput: Input, toolCallId = call): SessionNotification => ({
  sessionId: 'acp-session',
  update: {
    sessionUpdate: toolCall,
    toolCallId,
    title: command,
    kind: 'execute',
    status: 'pending',
    rawInput,
    _meta: { terminal_info: { terminal_id: toolCallId, cwd } },
  },
});

const update = 'tool_call_update';

const exited = (toolCallId = call): SessionNotification => ({
  sessionId: 'acp-session',
  update: {
    sessionUpdate: update,
    toolCallId,
    _meta: {
      terminal_exit: { terminal_id: toolCallId, exit_code: 0, signal: null },
    },
  },
});

const background = {
  command,
  run_in_background: true,
} as const;

it('records a command the Agent ran in the background as a running Shell', async (): Promise<void> => {
  const { notify, changes } = openMemoryShells();

  notify(started(background));

  await vi.waitFor(() =>
    expect(changes).toMatchObject([
      {
        id: call,
        toolCallId: call,
        command,
        cwd,
        status: 'running',
      },
    ]),
  );
});

it('ends that Shell when the Agent reports the command finished', async (): Promise<void> => {
  const { notify, changes, database } = openMemoryShells();
  notify(started(background));
  await vi.waitFor(() => expect(changes).toHaveLength(1));

  notify(exited());

  await vi.waitFor(() =>
    expect(changes.at(-1)).toMatchObject({ status: 'exited', exitCode: 0 }),
  );
  expect(database.select().from(shell).all()).toMatchObject([
    { id: call, status: 'exited' },
  ]);
});

it('does not record a command that ran in the foreground', async (): Promise<void> => {
  const { notify, changes } = openMemoryShells();

  notify(started({ command: 'ls' }));
  notify(exited());
  await new Promise((resolve) => setTimeout(resolve, 20));

  expect(changes).toEqual([]);
});

it('records the Shell once when the Agent repeats the command, and cannot stop it', async (): Promise<void> => {
  const { notify, changes, shells } = openMemoryShells();

  notify(started(background));
  notify(started(background));
  await vi.waitFor(() => expect(changes.length).toBeGreaterThan(0));

  expect(new Set(changes.map(({ id }) => id))).toEqual(new Set([call]));
  expect(shells.canStop(call)).toBe(false);
});
