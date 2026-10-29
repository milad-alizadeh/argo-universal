import { type AgentMessage, SessionRecord } from '@repo/contracts';
import { expect, it, onTestFinished, vi } from 'vitest';
import { selectSession, submitWrites } from '#mocks/queued-writes';
import { FeedRowsJob } from '../../feed';
import {
  readQueuedSessionRows,
  SessionDeleteJob,
  SessionInsertJob,
  SessionRowUpdateJob,
} from '.';

const reply: AgentMessage = {
  sessionId: 'session-1',
  id: 'row-1',
  position: 0,
  sessionUpdate: 'agent_message',
  revision: 1,
  turnId: 'turn-1',
  state: 'open',
  messageId: 'message-1',
  content: [{ type: 'text', text: 'Complete' }],
};

const sessionData = SessionRecord.omit({ createdAt: true, updatedAt: true });

it('reads a queued Session row update exactly as its commit', async (): Promise<void> => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(12000);
  onTestFinished(() => clock.mockRestore());
  const before = SessionRecord.parse(selectSession());
  const original = structuredClone(before);

  const { writer, committed } = submitWrites([
    new SessionRowUpdateJob({
      id: 'session-1',
      activityAt: 12000,
      set: {
        vendorSessionId: 'vendor-resume',
        epoch: 2,
        maxRevision: 3,
        activityAt: 999,
      },
    }),
  ]);

  const queued = readQueuedSessionRows(writer).session(before, 'session-1');
  await committed;
  expect(sessionData.parse(queued)).toEqual(sessionData.parse(selectSession()));
  expect(queued).toMatchObject({ activityAt: 12000, maxRevision: 3 });
  expect(before).toEqual(original);
});

it('reads a queued Session insert exactly as its commit', async (): Promise<void> => {
  const { writer, committed } = submitWrites([
    new SessionInsertJob({
      checkoutChoice: { type: 'main' },
      session: {
        id: 'session-2',
        projectId: 'project-1',
        agent: 'mock',
        checkoutPath: '/new',
        projectionVersion: 1,
        title: 'New Session',
      },
    }),
  ]);

  const queued = readQueuedSessionRows(writer).session(undefined, 'session-2');
  await committed;
  expect(sessionData.parse(queued)).toEqual(
    sessionData.parse(selectSession('session-2')),
  );
});

it('reads the Session revision of queued Feed rows exactly as their commit', async (): Promise<void> => {
  const before = SessionRecord.parse(selectSession());

  const { writer, committed } = submitWrites([
    new FeedRowsJob({
      sessionId: 'session-1',
      rows: [reply],
      maxRevision: 1,
      activityAt: 100,
    }),
  ]);

  const queued = readQueuedSessionRows(writer).session(before, 'session-1');
  await committed;
  expect(sessionData.parse(queued)).toEqual(sessionData.parse(selectSession()));
});

it('reads a queued Session removal over a later update exactly as their commit', async (): Promise<void> => {
  const before = SessionRecord.parse(selectSession());

  const { writer, committed } = submitWrites([
    new SessionDeleteJob('session-1'),
    new SessionRowUpdateJob({ id: 'session-1', set: { epoch: 2 } }),
  ]);

  const queued = readQueuedSessionRows(writer).session(before, 'session-1');
  await committed;
  expect(queued).toBeUndefined();
  expect(selectSession()).toBeUndefined();
});
