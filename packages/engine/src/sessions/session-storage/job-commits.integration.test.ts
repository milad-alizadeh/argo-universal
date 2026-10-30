import { describe, expect, it } from 'vitest';
import {
  runningTurn,
  selectSession,
  selectTurn,
  testDatabase,
} from '#mocks/queued-writes';
import { type WriterJob, writeJobs } from '../../storage';
import {
  SessionInsertJob,
  SessionRowUpdateJob,
  TurnInsertJob,
  TurnUpdateJob,
} from '.';

describe('commit', (): void => {
  it('inserts a Turn, then updates it', (): void => {
    writeJobs(testDatabase(), [
      new TurnInsertJob({ turn: runningTurn }),
      new TurnUpdateJob({
        id: 'turn-1',
        set: { status: 'ended', stopReason: 'end_turn', endedAt: 5 },
      }),
    ]);

    expect(selectTurn()).toEqual(
      expect.objectContaining({
        sessionId: 'session-1',
        status: 'ended',
        stopReason: 'end_turn',
        endedAt: 5,
      }),
    );
  });

  it('updates a session row', (): void => {
    writeJobs(testDatabase(), [
      new SessionRowUpdateJob({
        id: 'session-1',
        set: { vendorSessionId: 'vendor-1', epoch: 2 },
      }),
    ]);

    expect(selectSession()).toEqual(
      expect.objectContaining({ vendorSessionId: 'vendor-1', epoch: 2 }),
    );
  });

  it('stores a new Session and remembers its checkout choice on the Project', (): void => {
    writeJobs(testDatabase(), [
      new SessionInsertJob({
        checkoutChoice: { type: 'worktree' },
        session: {
          id: 'session-2',
          projectId: 'project-1',
          agent: 'mock',
          checkoutPath: '/new',
          projectionVersion: 1,
        },
      }),
    ]);

    expect(selectSession('session-2')).toMatchObject({ checkoutPath: '/new' });
    expect(
      testDatabase()
        .$client.prepare('SELECT checkout_choice FROM project')
        .get(),
    ).toEqual({ checkout_choice: JSON.stringify({ type: 'worktree' }) });
  });
});

it.each<[WriterJob, string]>([
  [
    new TurnInsertJob({ turn: runningTurn }),
    'insert Turn turn-1 of Session session-1',
  ],
  [
    new TurnUpdateJob({ id: 'turn-1', set: { status: 'ended' } }),
    'update Turn turn-1: status',
  ],
  [
    new SessionRowUpdateJob({
      id: 'session-1',
      set: { epoch: 1, vendorSessionId: 'vendor-1' },
    }),
    'update Session session-1: epoch, vendorSessionId',
  ],
])('names %s in the log of lost jobs as %s', (job, description): void => {
  expect(job.describe()).toBe(description);
});
