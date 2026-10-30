import type { SessionNewInput } from '@repo/contracts';
import { afterEach, expect, it } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { storedMessage } from '#mocks/feed';
import { FeedRowsJob } from '../../feed';
import { titleFromPrompt } from '../../feed';
import { writerMachine } from '../../storage';
import { loadSession } from '../session-load';
import { SessionRowUpdateJob } from '../session-storage';

const cleanups: (() => void)[] = [];

afterEach((): void => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

it.each([
  [
    [{ type: 'text', text: '  \n  Fix the build\nThen test it' }],
    'Fix the build',
  ],
  [
    [
      { type: 'text', text: 'One line' },
      { type: 'text', text: 'Two' },
    ],
    'One line',
  ],
  [
    [
      {
        type: 'image',
        mimeType: 'image/png',
        blob: { blobId: 'image-1', mime: 'image/png', bytes: 3 },
      },
      { type: 'text', text: 'What is this?' },
    ],
    'What is this?',
  ],
  [[], ''],
] satisfies [SessionNewInput['prompt'], string][])(
  'titles the prompt %j as %j',
  (prompt, title): void => {
    expect(titleFromPrompt(prompt)).toBe(title);
  },
);

it('reloads Feed positions and the vendor Session from writes still queued', async (): Promise<void> => {
  const { database, directory: runtimeDirectory, remove } = openTestDatabase();
  cleanups.push(remove);
  database.$client
    .exec(`CREATE TRIGGER hold_session_write BEFORE UPDATE OF vendor_session_id ON session
    BEGIN SELECT RAISE(ABORT, 'database is locked'); END`);

  const writer = createActor(writerMachine, {
    input: { now: (): number => Date.now(), database },
  }).start();

  cleanups.push((): typeof writer => writer.stop());
  writer.send({
    type: 'writer.write',
    job: new SessionRowUpdateJob({
      id: 'session-1',
      set: { vendorSessionId: 'vendor-resume' },
    }),
  });
  writer.send({
    type: 'writer.write',
    job: new FeedRowsJob({
      sessionId: 'session-1',
      maxRevision: 12,
      rows: [storedMessage(4, 12)],
    }),
  });
  await waitFor(writer, (snapshot): boolean =>
    snapshot.matches('waitingToRetry'),
  );
  expect(
    await loadSession(
      { database, runtimeDirectory, sessionId: 'session-1', kind: 'existing' },
      writer,
    ),
  ).toMatchObject({
    vendorSessionId: 'vendor-resume',
    maxRevision: 12,
    nextPosition: 5,
  });
});
