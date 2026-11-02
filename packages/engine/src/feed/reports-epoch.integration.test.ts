import type { SubagentUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
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

it('restarts a stale report cursor at the current epoch tail', async () => {
  await startFeedTestHost();
  writeJobs(database, [
    new FeedRowsJob({ sessionId: 'session-1', rows: [report], maxRevision: 6 }),
  ]);

  const page = await createFeedRouterCaller().feed.reports({
    sessionId: 'session-1',
    childSessionId: 'child',
    direction: 'before',
    cursor: report.position,
    epoch: 2,
    limit: 1,
  });

  expect(page).toMatchObject({ epoch: 3, rows: [report], staleCursor: true });
});
