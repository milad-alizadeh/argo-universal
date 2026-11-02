import { writeFile } from 'node:fs/promises';
import { assert, expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  backgroundResult,
  reportedCommand,
  reportedEnd,
} from '#mocks/acp-terminal-output';
import { sender, writeTaskFile } from '#mocks/adapter-shells';
import { openMemoryShells } from '#mocks/memory-shells';
import { collectShellOutput } from '#mocks/shell-output';

const call = 'toolu-1';

const command = 'pnpm verify';

const background = { command, run_in_background: true };

it('takes the exit code from the task file when the Agent reports the end', async (): Promise<void> => {
  const { notify, changes } = openMemoryShells();

  const send = sender(notify);
  const path = await writeTaskFile('failed\n');
  send(reportedCommand(call, background));
  send(backgroundResult(call, path));
  await vi.waitFor(() => expect(changes).toHaveLength(1));

  await writeFile(path, 'failed\n\n[exited with code 3]\n');
  send([reportedEnd(call)]);

  await vi.waitFor(() =>
    expect(changes.at(-1)).toMatchObject({ status: 'exited', exitCode: 3 }),
  );
});

it('ends the Shell at the task file exit line when the Agent never reports the end', async (): Promise<void> => {
  const { notify, changes } = openMemoryShells();

  const send = sender(notify);
  const path = await writeTaskFile('done\n\n[exited with code 0]\n');

  send(reportedCommand(call, background));
  send(backgroundResult(call, path));

  await vi.waitFor(() =>
    expect(changes.at(-1)).toMatchObject({ status: 'exited', exitCode: 0 }),
  );
});

it('does not follow a path from anything but the background result', async (): Promise<void> => {
  const { notify, changes } = openMemoryShells();

  const send = sender(notify);
  const path = await writeTaskFile('secret\n[exited with code 0]\n');
  send(reportedCommand(call, background));

  send([
    {
      sessionUpdate: 'tool_call_update',
      toolCallId: call,
      _meta: {
        terminal_output_delta: {
          terminal_id: call,
          data: `cat says Output is being written to: ${path}.`,
        },
      },
    },
  ]);
  await new Promise((resolve) => setTimeout(resolve, 600));

  expect(changes.at(-1)).toMatchObject({ status: 'running' });
});

it('does not follow a task file for a command that ran in the foreground', async (): Promise<void> => {
  const { notify, changes } = openMemoryShells();

  const send = sender(notify);
  const path = await writeTaskFile('[exited with code 0]\n');

  send(reportedCommand(call, { command: 'ls' }));
  send(backgroundResult(call, path));
  send([reportedEnd(call)]);
  await new Promise((resolve) => setTimeout(resolve, 20));

  expect(changes).toEqual([]);
});

it('a background command reaches the Session the Workbench reads, with its output and exit code', async (): Promise<void> => {
  const path = await writeTaskFile('BG_MARK\n\n[exited with code 2]\n');

  const host = await startAcpEngine({
    steps: [
      ...reportedCommand(call, background),
      ...backgroundResult(call, path),
    ].map((update) => ({ type: 'update', update })),
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Run' }],
  });

  const { shells } = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.shells[0]?.status === 'exited',
  );

  assert(shells[0]);
  expect(shells[0]).toMatchObject({ command, exitCode: 2 });

  const output = await host.caller.shell.output({
    ...created,
    shellId: shells[0].id,
  });

  const chunks = await collectShellOutput(output);

  expect(chunks.map(({ text }) => text).join('')).toContain('BG_MARK');
});
