import type { RunOutput } from '@repo/contracts';
import { expect, it, vi } from 'vitest';
import type { RunOutputSource } from './run-terminal-props';
import {
  readTerminalFrames,
  RunTerminalReplay,
  terminalFrame,
} from './run-terminal-replay';

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

it('keeps only the new bytes after reconnecting to a partially replayed frame', () => {
  const repeated = {
    cursor: { ...frame.cursor, offset: 2 },
    data: btoa('ab'),
  };

  expect(terminalFrame(frame.cursor, frame)).toBeUndefined();
  expect(terminalFrame(frame.cursor, repeated)).toEqual({
    cursor: repeated.cursor,
    reset: false,
    bytes: Uint8Array.of(98),
  });
  expect(
    terminalFrame(frame.cursor, {
      cursor: { runId: 'replacement', offset: 0 },
      data: '',
    }),
  ).toEqual({
    cursor: { runId: 'replacement', offset: 0 },
    reset: true,
    bytes: new Uint8Array(),
  });
});

it('pulls from the accepted cursor when a delayed frame is behind it', async () => {
  const current = { ...frame.cursor, offset: 2 };
  const next = { ...frame.cursor, offset: 3 };

  const read = vi
    .fn<Parameters<typeof readTerminalFrames>[0]>()
    .mockResolvedValueOnce(frame)
    .mockResolvedValueOnce({ cursor: next, data: btoa('c') })
    .mockResolvedValue(null);

  let cursor = current;

  const stop = readTerminalFrames(read, current, (output) => {
    const accepted = terminalFrame(cursor, output);

    if (accepted) cursor = accepted.cursor;

    return cursor;
  });

  try {
    await vi.waitFor(() => expect(read).toHaveBeenNthCalledWith(3, next));
    expect(read).toHaveBeenNthCalledWith(2, current);
  } finally {
    stop();
  }
});

it('resumes the recording after the native bridge drops a full buffer', async () => {
  const replay = new RunTerminalReplay();
  const unsubscribe = vi.fn<() => void>();

  const deliver = vi.fn<RunOutputSource>((cursor, receive) => {
    receive(frame);

    if (!cursor)
      for (let offset = 2; offset <= 10; offset += 1)
        receive({ ...frame, cursor: { ...frame.cursor, offset } });

    return unsubscribe;
  });

  replay.connect(deliver);

  await expect(replay.read(null)).resolves.toEqual(frame);
  await replay.read(frame.cursor);

  expect(unsubscribe).toHaveBeenCalledOnce();
  expect(deliver).toHaveBeenNthCalledWith(
    2,
    frame.cursor,
    expect.any(Function),
  );
  replay.connect();
});
