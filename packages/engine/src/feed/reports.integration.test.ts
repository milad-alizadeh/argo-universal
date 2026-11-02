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

it('walks more than 150 matching reports without including another Agent', async () => {
  await startFeedTestHost();

  const reports: SubagentUpdate[] = Array.from({ length: 181 }, (_, index) => ({
    ...report,
    id: `report-${index}`,
    position: index + 200,
    revision: index + 200,
  }));

  const other: SubagentUpdate = {
    ...report,
    id: 'other-agent',
    position: 381,
    revision: 381,
    subagentSessionId: 'other-child',
  };

  writeJobs(database, [
    new FeedRowsJob({
      sessionId: 'session-1',
      rows: [...reports, other],
      maxRevision: 381,
    }),
  ]);

  const found = await allReports();

  expect(found.map(({ id }) => id)).toEqual(reports.map(({ id }) => id));
});

async function allReports(): Promise<SubagentUpdate[]> {
  const caller = createFeedRouterCaller();

  const found: SubagentUpdate[] = [];

  let page = await caller.feed.reports({
    sessionId: 'session-1',
    childSessionId: 'child',
    direction: 'tail',
    limit: 40,
  });

  for (let index = 0; index < 5; index += 1) {
    found.unshift(
      ...page.rows.filter(
        (row): row is SubagentUpdate => row.sessionUpdate === 'subagent_update',
      ),
    );

    if (!page.hasOlder) return found;

    page = await caller.feed.reports({
      sessionId: 'session-1',
      childSessionId: 'child',
      direction: 'before',
      cursor: reportCursor(page.startCursor),
      epoch: page.epoch,
      limit: 40,
    });
  }

  return found;
}

function reportCursor(cursor: number | null): number {
  if (cursor === null) throw new Error('Missing report cursor');

  return cursor;
}
