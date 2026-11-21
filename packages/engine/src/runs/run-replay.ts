import { open } from 'node:fs/promises';
import type { RunOutput, RunOutputCursor } from '@repo/contracts';
import type { Standing } from './run-terminals';

const chunkSize = 32 * 1024;

type Recording = {
  read: () => Promise<Standing>;
  listen: (changed: () => void) => () => void;
};

async function recordedBytes(path: string, offset: number): Promise<Buffer> {
  const file = await open(path, 'r').catch((error: NodeJS.ErrnoException) => {
    // A new Run replaces the previous recording and wakes this subscription.
    if (error.code !== 'ENOENT') throw error;

    return undefined;
  });

  if (file === undefined) return Buffer.alloc(0);

  try {
    const buffer = Buffer.alloc(chunkSize);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, offset);

    return buffer.subarray(0, bytesRead);
  } finally {
    await file.close();
  }
}

async function nextFrame(
  { record, output }: Standing,
  cursor: RunOutputCursor | undefined,
): Promise<RunOutput | undefined> {
  if (!record || !output) return undefined;
  const sameRun = cursor?.runId === record.id;
  const offset = sameRun ? cursor.offset : 0;
  const bytes = await recordedBytes(output, offset);

  if (sameRun && bytes.length === 0) return undefined;

  return {
    cursor: { runId: record.id, offset: offset + bytes.length },
    data: bytes.toString('base64'),
  };
}

// Replays the recording while writes continue. One pending wake is enough because the
// next read takes every new byte from the cursor, including bytes written during replay.
export async function* watchRunOutput(
  recording: Recording,
  cursor: RunOutputCursor | undefined,
  signal: AbortSignal,
): AsyncGenerator<RunOutput> {
  if (signal.aborted) return;
  let wake = Promise.withResolvers<void>();
  const notify = (): void => wake.resolve();
  const unlisten = recording.listen(notify);
  signal.addEventListener('abort', notify, { once: true });

  try {
    while (!signal.aborted) {
      const frame = await nextFrame(await recording.read(), cursor);

      if (signal.aborted) return;
      if (frame) {
        cursor = frame.cursor;
        yield frame;
        continue;
      }

      await wake.promise;
      wake = Promise.withResolvers<void>();
    }
  } finally {
    unlisten();
    signal.removeEventListener('abort', notify);
  }
}
