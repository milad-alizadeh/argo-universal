import { SessionRecord } from '@repo/contracts';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  runningTurn,
  selectSession,
  selectTurn,
  submitWrites,
} from '#mocks/queued-writes';
import { FeedRowsJob } from '../../feed';
import { readQueuedSessionRows, SessionRowUpdateJob, TurnInsertJob } from '.';

const committedTurn = (): number | null => selectTurn()?.startedAt ?? null;

it.each([
  {
    kind: 'Feed rows',
    job: new FeedRowsJob({ sessionId: 'session-1', rows: [], maxRevision: 2 }),
    expected: { activityAt: 12000, startedAt: null },
  },
  {
    kind: 'Session revision',
    job: new SessionRowUpdateJob({ id: 'session-1', set: { maxRevision: 2 } }),
    expected: { activityAt: 12000, startedAt: null },
  },
  {
    kind: 'Turn insert',
    job: new TurnInsertJob({ turn: runningTurn }),
    expected: { activityAt: 0, startedAt: 12000 },
  },
  {
    kind: 'supplied Feed stamp',
    job: new FeedRowsJob({
      sessionId: 'session-1',
      rows: [],
      maxRevision: 2,
      activityAt: 100,
    }),
    expected: { activityAt: 100, startedAt: null },
  },
  {
    kind: 'supplied Session stamp',
    job: new SessionRowUpdateJob({
      id: 'session-1',
      set: { maxRevision: 2 },
      activityAt: 200,
    }),
    expected: { activityAt: 200, startedAt: null },
  },
  {
    kind: 'supplied Turn stamp',
    job: new TurnInsertJob({ turn: { ...runningTurn, startedAt: 300 } }),
    expected: { activityAt: 0, startedAt: 300 },
  },
])(
  'keeps $kind times equal across repeated reads and commit',
  async ({ job, expected }): Promise<void> => {
    const before = SessionRecord.parse(selectSession());
    const { writer, committed } = submitWrites([job]);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(20000);
    onTestFinished(() => clock.mockRestore());

    const readActivity = (): number =>
      readQueuedSessionRows(writer).session(before, 'session-1')?.activityAt ??
      0;

    const readTurn = (): number | null =>
      readQueuedSessionRows(writer).turns([])[0]?.startedAt ?? null;

    const readTimes = (): typeof expected => ({
      activityAt: readActivity(),
      startedAt: readTurn(),
    });

    expect(readTimes()).toEqual(expected);
    clock.mockReturnValue(30000);
    expect(readTimes()).toEqual(expected);
    await committed;
    expect({
      activityAt: selectSession()?.activityAt,
      startedAt: committedTurn(),
    }).toEqual(expected);
  },
);
