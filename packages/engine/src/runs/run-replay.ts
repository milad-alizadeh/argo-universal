import { open } from 'node:fs/promises';
import type { RunOutput, RunOutputCursor } from '@repo/contracts';

const chunkBytes = 32_768;

export type RunRecording = { runId: string; path: string };

type Recording = {
  current: () => RunRecording | undefined;
  listen: (changed: () => void) => () => void;
};

async function recordedBytes(path: string, offset: number): Promise<Buffer> {
  const file = await open(path, 'r').catch((error: NodeJS.ErrnoException) => {
    // A new Run replaces the previous recording and wakes this subscription.
    if (error.code !== 'ENOENT') throw error;
  });

  if (!file) return Buffer.alloc(0);

  try {
    const buffer = Buffer.alloc(chunkBytes);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, offset);

    return buffer.subarray(0, bytesRead);
  } finally {
    await file.close();
  }
}

async function nextFrame(
  recording: RunRecording | undefined,
  cursor: RunOutputCursor | undefined,
): Promise<RunOutput | undefined> {
  if (!recording) return undefined;
  const { runId, path } = recording;
  const sameRun = cursor?.runId === runId;
  const offset = sameRun ? cursor.offset : 0;
  const bytes = await recordedBytes(path, offset);

  if (sameRun && bytes.length === 0) return undefined;

  return {
    cursor: { runId, offset: offset + bytes.length },
    data: bytes.toString('base64'),
  };
}

type PendingOutput = Disposable & { wait: () => Promise<void> };

// One pending wake is enough because the next read takes all new bytes from the cursor.
function pendingOutput(
  recording: Recording,
  signal: AbortSignal,
): PendingOutput {
  let wake = Promise.withResolvers<void>();
  const notify = (): void => wake.resolve();
  const unlisten = recording.listen(notify);
  signal.addEventListener('abort', notify, { once: true });

  return {
    wait: async (): Promise<void> => {
      await wake.promise;
      wake = Promise.withResolvers<void>();
    },
    [Symbol.dispose]: () => {
      unlisten();
      signal.removeEventListener('abort', notify);
    },
  };
}

export async function* watchRunOutput(
  recording: Recording,
  from: RunOutputCursor | undefined,
  signal: AbortSignal,
): AsyncGenerator<RunOutput> {
  if (signal.aborted) return;
  using updates = pendingOutput(recording, signal);
  let cursor = from;

  while (!signal.aborted) {
    const frame = await nextFrame(recording.current(), cursor);

    if (signal.aborted) return;

    if (frame) {
      cursor = frame.cursor;
      yield frame;
    } else await updates.wait();
  }
}
