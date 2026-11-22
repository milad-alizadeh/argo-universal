import { QueuedPromptId } from '@repo/contracts';
import { expect, it } from 'vitest';
import { startTestWriter, testDatabase } from '#mocks/queued-writes';
import { writeDatabaseJobAndWaitForCommit } from '../storage';
import { queueWrite } from './prompt-queue';
import {
  deliverQueuedPrompt,
  type PromptDeliverySessions,
} from './queue-delivery';
import {
  createQueuedSessionReader,
  createSessionReader,
} from './session-record';
import { SessionRowUpdateJob } from './session-storage';

const sessionId = 'session-1';

const firstId = 'first-result';

const queued = 'queued';

const receiptTitle = 'Delivery recorded';

const pauseReason = 'Paused by the person';

function closedSessions(): PromptDeliverySessions {
  const writer = startTestWriter();

  return {
    admit: () => {},
    queued: createQueuedSessionReader({
      database: testDatabase(),
      findWriter: () => writer,
    }),
    session: () => {},
    write: (job) => writeDatabaseJobAndWaitForCommit(writer, job),
  };
}

function append(
  sessions: PromptDeliverySessions,
  id: string,
): ReturnType<typeof deliverQueuedPrompt> {
  return deliverQueuedPrompt(
    sessions,
    {
      sessionId,
      pauseWhenClosed: 'Resume delegated results',
      delivery: {
        command: { action: 'append', prompt: [{ type: 'text', text: id }] },
        sender: { type: 'session', sessionId: 'source', title: 'Source' },
        queuedId: id,
        commitWith: new SessionRowUpdateJob({
          id: sessionId,
          set: { title: receiptTitle },
        }),
      },
    },
    new AbortController().signal,
  );
}

it('keeps the existing pause and queue order across competing deliveries and replay', async () => {
  const sessions = closedSessions();
  await sessions.write(
    queueWrite(sessionId, {
      pauseReason,
      items: [
        {
          id: QueuedPromptId.parse('existing'),
          prompt: [{ type: 'text', text: 'Existing Prompt' }],
          revision: 0,
        },
      ],
    }),
  );

  const outcomes = await Promise.all([
    append(sessions, firstId),
    append(sessions, 'second-result'),
    append(sessions, firstId),
  ]);

  expect(outcomes).toEqual([queued, queued, queued]);

  const stored = createSessionReader(testDatabase())(sessionId);
  expect(stored.promptQueue.pauseReason).toBe(pauseReason);
  expect(stored.promptQueue.items.map(({ id }) => id)).toEqual([
    'existing',
    firstId,
    'second-result',
  ]);
  expect(stored.title).toBe(receiptTitle);
});

it('skips an archived Session without storing its Prompt or receipt', async () => {
  const sessions = closedSessions();
  await sessions.write(
    new SessionRowUpdateJob({ id: sessionId, set: { archivedAt: 1 } }),
  );

  await expect(append(sessions, 'result')).resolves.toBe('archived');

  const stored = createSessionReader(testDatabase())(sessionId);
  expect(stored.promptQueue.items).toEqual([]);
  expect(stored.title).not.toBe(receiptTitle);
});
