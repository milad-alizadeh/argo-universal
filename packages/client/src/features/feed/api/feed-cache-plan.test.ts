import type { PlanUpdate } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { page, streamed, upsert } from '../../../../mocks/feed-state.mocks';
import { feedCacheHarness } from '../../../../mocks/feed/feed-cache.mocks';

const { rows, snapshot } = streamed;

// The checklist keeps the position of its first row (ADR-0007), so in a long Session it sits before the held window.
const todos: PlanUpdate = {
  id: 'todos',
  sessionId: rows[0]?.sessionId ?? 'session',
  turnId: null,
  position: -1,
  revision: 1,
  state: 'settled',
  sessionUpdate: 'plan_update',
  plan: {
    type: 'items',
    planId: 'todos',
    entries: [
      { content: 'Find the cause', priority: 'medium', status: 'completed' },
      { content: 'Fix it', priority: 'medium', status: 'in_progress' },
    ],
  },
  _meta: { argo: { removed: false, contentRevision: 1 } },
};

const steppedTodos: PlanUpdate = {
  ...todos,
  revision: snapshot.maxRevision + 1,
  plan: {
    type: 'items',
    planId: 'todos',
    entries: [
      { content: 'Find the cause', priority: 'medium', status: 'completed' },
      { content: 'Fix it', priority: 'medium', status: 'completed' },
    ],
  },
  _meta: {
    argo: { removed: false, contentRevision: snapshot.maxRevision + 1 },
  },
};

// A tail that holds only the newest rows, with the checklist older than all of them.
const tail = {
  ...page(rows, snapshot.maxRevision, { limit: 2 }),
  hasOlder: true,
  plan: todos,
};

describe('FeedCache checklist outside the held rows', () => {
  it('holds the checklist a tail page carries beside its rows', async () => {
    const h = feedCacheHarness();
    h.cache.start();
    h.answer('tail', tail);
    await h.queryClient.fetchQuery(h.cache.tailOptions());

    expect(h.cache.read().plan).toEqual(todos);
    expect(h.cache.read().startCursor).toBe(tail.startCursor);
  });

  it('holds a revision of the checklist that lands before the held rows', async () => {
    const h = feedCacheHarness();
    h.cache.start();
    h.answer('tail', { ...tail, plan: undefined });
    await h.queryClient.fetchQuery(h.cache.tailOptions());

    h.cache.receive({
      type: upsert,
      row: steppedTodos,
      rev: steppedTodos.revision,
    });
    h.drawFrame();

    expect(h.cache.read().plan).toEqual(steppedTodos);
    expect(h.cache.read().startCursor).toBe(tail.startCursor);
  });
});
