import type { Notice } from '@repo/contracts';
import { expect, it } from 'vitest';
import { committedTurnEndings } from './committed-turn-endings';
import { FeedRowsJob } from './feed-rows-job';

const notice = (fields: Partial<Notice>): Notice => ({
  sessionId: 'session-1',
  id: 'turn-1:end',
  sessionUpdate: 'notice',
  state: 'settled',
  position: 3,
  revision: 4,
  turnId: 'turn-1',
  severity: 'info',
  title: 'Turn ended',
  ...fields,
});

const liveRows = (rows: Notice[]): FeedRowsJob =>
  new FeedRowsJob({ sessionId: 'session-1', rows, maxRevision: 4 });

const ending = notice({
  _meta: {
    argo: { turnEnd: { stopReason: 'end_turn', error: null, durationMs: 5 } },
  },
});

it('reports a Turn ending the live Feed committed', () => {
  expect(committedTurnEndings([liveRows([ending])])).toEqual([
    { sessionId: 'session-1', turnId: 'turn-1' },
  ]);
});

it('ignores a Notice that ends no Turn', () => {
  const crash = notice({ id: 'turn-1:crash', severity: 'warning' });

  expect(committedTurnEndings([liveRows([crash])])).toEqual([]);
});
