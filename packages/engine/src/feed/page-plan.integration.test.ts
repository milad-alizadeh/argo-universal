import type { PlanUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import { storedMessage as message } from '#mocks/feed';
import {
  createFeedRouterCaller,
  database,
  startFeedTestHost,
} from '#mocks/feed-suite';
import { FeedRowsJob } from '../feed';
import { writeJobs } from '../storage';

// A checklist that keeps the position of its first row while later rows follow it (ADR-0007).
const todos: PlanUpdate = {
  id: 'todos',
  sessionId: 'session-1',
  position: 1,
  revision: 6,
  turnId: 'turn-1',
  state: 'settled',
  sessionUpdate: 'plan_update',
  plan: {
    type: 'items',
    planId: 'todos',
    entries: [{ content: 'Fix it', priority: 'medium', status: 'in_progress' }],
  },
  _meta: { argo: { removed: false, contentRevision: 6 } },
};

const storeTodosAtPosition1 = (): void => {
  database.$client
    .prepare('DELETE FROM feed_row WHERE session_id = ? AND position = 1')
    .run('session-1');
  writeJobs(database, [
    new FeedRowsJob({ sessionId: 'session-1', rows: [todos], maxRevision: 6 }),
  ]);
};

it('carries the Plan that lies before the tail beside its rows', async (): Promise<void> => {
  await startFeedTestHost();
  storeTodosAtPosition1();

  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 2,
    }),
  ).toMatchObject({
    rows: [message(3), message(4)],
    startCursor: 3,
    plan: todos,
  });
});

it('leaves the Plan out of a page that holds it', async (): Promise<void> => {
  await startFeedTestHost();
  storeTodosAtPosition1();

  const page = await createFeedRouterCaller().feed.page({
    sessionId: 'session-1',
    direction: 'tail',
    limit: 4,
  });

  expect(page.rows).toContainEqual(todos);
  expect(page.plan).toBeUndefined();
});
