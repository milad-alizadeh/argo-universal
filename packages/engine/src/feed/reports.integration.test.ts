import type { SubagentUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import { storedMessage } from '#mocks/feed';
import {
  createFeedRouterCaller,
  database,
  startFeedTestHost,
} from '#mocks/feed-suite';
import { writeJobs } from '../storage';
import { FeedRowsJob } from './feed-rows-job';

const report: SubagentUpdate = {
  id: 'report',
  sessionId: 'session-1',
  position: 5,
  revision: 6,
  turnId: null,
  state: 'settled',
  sessionUpdate: 'subagent_update',
  subagentSessionId: 'child',
  _meta: { argo: { result: [{ type: 'text', text: 'Two packages.' }] } },
};

it('finds an older Agent report without paging through newer unrelated Feed rows', async () => {
  await startFeedTestHost();
  writeJobs(database, [
    new FeedRowsJob({
      sessionId: 'session-1',
      rows: [
        report,
        ...Array.from({ length: 180 }, (_, index) => storedMessage(index + 6)),
      ],
      maxRevision: 186,
    }),
  ]);

  const result = await createFeedRouterCaller().feed.reports({
    sessionId: 'session-1',
    childSessionId: 'child',
    direction: 'tail',
  });

  expect(result.rows).toEqual([report]);
  expect(result.hasOlder).toBe(false);
});

it('pages only this Agent’s reports in parent Feed order', async () => {
  await startFeedTestHost();

  const later: SubagentUpdate = {
    ...report,
    id: 'later',
    position: 6,
    revision: 7,
    _meta: { argo: { result: [{ type: 'text', text: 'Later' }] } },
  };

  const other: SubagentUpdate = {
    ...report,
    id: 'other',
    position: 7,
    revision: 8,
    subagentSessionId: 'other-child',
  };

  writeJobs(database, [
    new FeedRowsJob({
      sessionId: 'session-1',
      rows: [report, later, other],
      maxRevision: 8,
    }),
  ]);
  const caller = createFeedRouterCaller();

  const tail = await caller.feed.reports({
    sessionId: 'session-1',
    childSessionId: 'child',
    direction: 'tail',
    limit: 1,
  });

  expect(tail).toMatchObject({ rows: [later], hasOlder: true, startCursor: 6 });
  expect(
    await caller.feed.reports({
      sessionId: 'session-1',
      childSessionId: 'child',
      direction: 'before',
      cursor: 6,
      epoch: tail.epoch,
      limit: 1,
    }),
  ).toMatchObject({ rows: [report], hasOlder: false });
});
