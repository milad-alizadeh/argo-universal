import type { PlanUpdate } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { page, streamed, upsert } from '../../../../mocks/feed-state.mocks';
import { sessionFeedHarness } from '../../../../mocks/feed/session-feed-store.mocks';

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

describe('SessionFeedStore checklist outside the held rows', () => {
  it('shows the checklist a tail page carries beside its rows', () => {
    const h = sessionFeedHarness();
    h.store.start();
    h.store.mergeHistory([tail]);
    h.store.receive({ type: 'snapshot', snapshot });
    h.drawFrame();

    expect(h.store.getState().view?.plan).toEqual(todos.plan);
    expect(h.store.getState().feed.startCursor).toBe(tail.startCursor);
  });

  it('shows a revision of the checklist that lands before the held rows', () => {
    const h = sessionFeedHarness();
    h.store.start();
    h.store.mergeHistory([{ ...tail, plan: undefined }]);
    h.store.receive({ type: 'snapshot', snapshot });
    h.drawFrame();

    h.store.receive({
      type: upsert,
      row: steppedTodos,
      rev: steppedTodos.revision,
    });
    h.drawFrame();

    expect(h.store.getState().view?.plan).toEqual(steppedTodos.plan);
    expect(h.store.getState().feed.startCursor).toBe(tail.startCursor);
  });
});
