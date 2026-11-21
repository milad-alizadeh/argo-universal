import type { RunOutput } from '@repo/contracts';
import { expect, it, vi } from 'vitest';
import type { RunOutputSource } from './run-terminal-props';
import { RunTerminalReplay } from './run-terminal-replay';

const frame = {
  cursor: { runId: 'first-run', offset: 1 },
  data: 'YQ==',
} satisfies RunOutput;

it('unblocks disconnected reads and asks for the rest of the same Run on reconnect', async () => {
  const replay = new RunTerminalReplay();

  const first = vi.fn<RunOutputSource>((_cursor, receive) => {
    receive(frame);

    return (): void => {};
  });

  const then = vi.fn<RunOutputSource>(() => (): void => {});

  replay.connect(first);

  await expect(replay.read(null)).resolves.toEqual(frame);

  const abandoned = replay.read(frame.cursor);

  replay.connect();

  await expect(abandoned).resolves.toBeNull();

  replay.connect(then);

  const rest = replay.read(frame.cursor);

  expect(then.mock.calls[0]?.[0]).toEqual(frame.cursor);

  replay.connect();

  await expect(rest).resolves.toBeNull();
});
