import type { Notice } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import type { WriterJob } from '../storage';
import { FeedRowsJob } from './feed-rows-job';
import { committedTurnEndings, type QueuedFeedJob } from './feed-storage';

const turnId = 'turn-1';

const endedAt = { stopReason: 'error', error: null, durationMs: 5 } as const;

const notice = (fields: Partial<Notice>): Notice => ({
  sessionId: 'session-1',
  id: 'turn-1:end',
  sessionUpdate: 'notice',
  state: 'settled',
  position: 3,
  revision: 4,
  turnId,
  severity: 'info',
  title: 'Turn ended',
  ...fields,
});

const liveRows = (rows: Notice[]): WriterJob =>
  new FeedRowsJob({ sessionId: 'session-1', rows, maxRevision: 4 });

// A job of a module Feed storage does not know: it shows only through the Feed rows it writes.
const foreignRows = (rows: Notice[]): WriterJob & QueuedFeedJob => ({
  describe: (): string => 'Feed rows of Session session-1',
  commit: (): void => undefined,
  queuedFeedRows: () => ({ sessionId: 'session-1', rows, maxRevision: 4 }),
});

describe.each([
  ['the live Feed', liveRows],
  ['a job of any module', foreignRows],
])('Feed rows of %s', (_, rowsJob): void => {
  it('report a Turn ending they commit', () => {
    const ending = notice({ _meta: { argo: { turnEnd: endedAt } } });

    expect(committedTurnEndings([rowsJob([ending])])).toEqual([
      { sessionId: 'session-1', turnId },
    ]);
  });

  it('ignore a Notice that ends no Turn', () => {
    const crash = notice({ id: 'turn-1:crash', severity: 'warning' });

    expect(committedTurnEndings([rowsJob([crash])])).toEqual([]);
  });
});
