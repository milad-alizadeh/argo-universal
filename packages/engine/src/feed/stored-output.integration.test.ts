import { type Database, openDatabase } from '@repo/db';
import { expect, it, onTestFinished } from 'vitest';
import { createActor, fromPromise } from 'xstate';
import { SqlJob } from '#mocks/storage-job';
import { writerMachine, type WriterJob } from '../storage';
import { FeedRowsJob } from './feed-rows-job';
import { outputBlobStored } from './stored-output';

const blobId = 'a'.repeat(64);

const outputJob = new FeedRowsJob({
  sessionId: 'session-1',
  rows: [],
  maxRevision: 0,
  blobs: [
    {
      blob: { blobId, mime: 'application/json', bytes: 2 },
      data: Buffer.from('{}'),
    },
  ],
});

type BatchInput = {
  database: Database;
  blobsFolder?: string;
  jobs: WriterJob[];
};

type HeldWriter = {
  writer: ReturnType<typeof createActor<typeof writerMachine>>;
  commit: () => void;
};

const writeEvent = 'writer.write';

// A Writer whose every batch waits until the test commits it.
function heldWriter(): HeldWriter {
  const batches: (() => void)[] = [];

  const machine = writerMachine.provide({
    actors: {
      writeBatch: fromPromise<void, BatchInput>(
        () => new Promise<void>((resolve) => batches.push(resolve)),
      ),
    },
  });

  const writer = createActor(machine, {
    input: { now: () => 0, database: openDatabase(':memory:') },
  }).start();

  onTestFinished(() => {
    writer.stop();
  });

  return { writer, commit: () => batches.shift()?.() };
}

const settledYet = async (stored: Promise<void>): Promise<boolean> => {
  let settled = false;
  void stored.then(() => (settled = true));
  await new Promise(setImmediate);

  return settled;
};

it('resolves at once when no queued job holds the Blob', async () => {
  const { writer } = heldWriter();

  await expect(outputBlobStored(writer, blobId)).resolves.toBeUndefined();
});

it('waits for the Writer receipt of the held job that stores the Blob, without polling', async () => {
  const { writer, commit } = heldWriter();
  writer.send({
    type: writeEvent,
    job: new SqlJob({ statement: 'SELECT 1' }),
  });
  writer.send({ type: writeEvent, job: outputJob });

  const stored = outputBlobStored(writer, blobId);

  expect(await settledYet(stored)).toBe(false);
  commit();
  expect(await settledYet(stored)).toBe(false);
  commit();
  await expect(stored).resolves.toBeUndefined();
});

it('stops waiting when the caller leaves', async () => {
  const { writer } = heldWriter();
  writer.send({ type: writeEvent, job: outputJob });
  const left = new AbortController();

  const stored = outputBlobStored(writer, blobId, left.signal);
  left.abort(new Error('The caller disconnected'));

  await expect(stored).rejects.toThrow('The caller disconnected');
});
