import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SqlJob } from '#mocks/storage-job';
import {
  drainWriterEvent,
  isRefusable,
  job,
  logLines,
  refusableJob,
  sendWrite,
  startWriterActor,
  writeBatchCalls,
  writeError,
  writeFeedEvent,
  writeRetryDelayMs,
  writer,
} from './writer-fixture.mocks';
import type { WriterJob } from './writer-job';
import { refusalLine, settle } from './writer-model-checks.mocks';
import './writer-model.mocks';

describe('database writer', (): void => {
  beforeEach((): void => {
    startWriterActor();
  });

  it('refuses refusable jobs past its budget, still queues other jobs, and accepts refusable jobs again after a commit', async (): Promise<void> => {
    sendWrite(true);

    const committed = {
      resolve: vi.fn<() => void>(),
      reject: vi.fn<(cause: unknown) => void>(),
    };

    const refused = vi.fn<() => void>();
    writer().send({
      type: writeFeedEvent,
      job: refusableJob(9),
      committed,
      refused,
    });
    sendWrite();

    expect(committed.reject).toHaveBeenCalledWith(
      new Error('Storage is failing'),
    );
    expect(committed.resolve).not.toHaveBeenCalled();
    expect(refused).toHaveBeenCalledOnce();
    expect(logLines).toEqual([refusalLine]);
    await settle((call): void => call.resolve());
    sendWrite(true);
    expect(writer().getSnapshot().context.queue.map(isRefusable)).toEqual([
      false,
      true,
    ]);
  });

  it('retries a failed batch with the jobs that arrived meanwhile', async (): Promise<void> => {
    sendWrite();
    sendWrite();
    sendWrite();
    await settle((call): void => call.reject(writeError));

    expect(logLines).toEqual([
      'could not write, keeping 3 jobs to retry: Error: database is locked',
    ]);
    vi.advanceTimersByTime(writeRetryDelayMs);
    // The batches hold the jobs as sent, stamped with their enqueue time.
    expect(writeBatchCalls.map((call): WriterJob[] => call.jobs)).toMatchObject(
      [[job(1)], [job(1), job(2), job(3)]],
    );
  });

  it('keeps the enqueue clock value when a write is retried', async (): Promise<void> => {
    writer().send({ type: writeFeedEvent, job: job(1) });
    await settle((call): void => call.reject(writeError));
    vi.advanceTimersByTime(writeRetryDelayMs);

    const stamped = new SqlJob({
      statement: 'UPDATE turn SET ended_at = 1',
      queuedAt: 1000,
    });

    expect(writeBatchCalls.map((call): WriterJob[] => call.jobs)).toEqual([
      [stamped],
      [stamped],
    ]);
  });

  it('logs each lost job when the drain fails', async (): Promise<void> => {
    sendWrite();
    writer().send({ type: drainWriterEvent });
    sendWrite();
    await settle((call): void => call.resolve());
    await settle((call): void => call.reject(writeError));

    expect(writer().getSnapshot().status).toBe('done');
    expect(logLines).toEqual([
      'could not write while draining, lost 1 jobs: Error: database is locked\nUPDATE turn SET ended_at = 2',
    ]);
  });

  it('names at most 20 lost jobs when the drain fails', async (): Promise<void> => {
    sendWrite();
    writer().send({ type: drainWriterEvent });

    for (let index = 0; index < 30; index += 1) sendWrite();
    await settle((call): void => call.resolve());
    await settle((call): void => call.reject(writeError));

    const lines = logLines.join('\n').split('\n');
    expect(lines[0]).toMatch(/^could not write while draining, lost 30 jobs/);
    expect(lines.slice(1)).toHaveLength(21);
    expect(lines.at(-1)).toBe('and 10 more');
  });
});
