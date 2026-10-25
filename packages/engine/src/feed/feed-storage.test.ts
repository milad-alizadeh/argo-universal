import type { Notice } from '@repo/contracts';
import { expect, it } from 'vitest';
import { FeedRowsJob } from './feed-rows-job';
import { committedTurnEndings } from './feed-storage';

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

const liveRows = (rows: Notice[]): FeedRowsJob =>
  new FeedRowsJob({ sessionId: 'session-1', rows, maxRevision: 4 });

it('reports a Turn ending the live Feed committed', () => {
  const ending = notice({ _meta: { argo: { turnEnd: endedAt } } });

  expect(committedTurnEndings([liveRows([ending])])).toEqual([
    { sessionId: 'session-1', turnId },
  ]);
});

it('ignores a Notice that ends no Turn', () => {
  const crash = notice({ id: 'turn-1:crash', severity: 'warning' });

  expect(committedTurnEndings([liveRows([crash])])).toEqual([]);
});
