import type { PlanUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import { recordedFeedMock } from '../../mocks/feed-message-mock';
import { toFeedView } from './to-feed-view';

const snapshot = recordedFeedMock('agent-1', 'markdown-answer').snapshot;
const oldPlan: PlanUpdate = {
  id: 'old-plan',
  sessionId: 'plan-session',
  turnId: null,
  position: 0,
  revision: 1,
  state: 'settled',
  sessionUpdate: 'plan_update',
  plan: { type: 'items', planId: 'old-plan', entries: [] },
};

const current: PlanUpdate = {
  ...oldPlan,
  id: 'current',
  position: 1,
  revision: 2,
  plan: { type: 'file', planId: 'current', uri: 'file:///project/plan.md' },
  _meta: { argo: { contentRevision: 2 } },
};
const removedOld: PlanUpdate = {
  ...oldPlan,
  revision: 4,
  _meta: { argo: { contentRevision: 1, removed: true } },
};
const removedCurrent = {
  ...current,
  revision: 5,
  _meta: { argo: { contentRevision: 2, removed: true } },
};
const replacedOld: PlanUpdate = {
  ...oldPlan,
  revision: 6,
  _meta: { argo: { contentRevision: 6, removed: false } },
};
it.each([
  {
    name: 'a later removal of an older Plan preserves the current read-only Plan',
    rows: [removedOld, current],
    expected: { plan: current.plan, items: [{ type: 'row', row: current }] },
  },
  {
    name: 'removing the current Plan clears it',
    rows: [removedOld, removedCurrent],
    expected: { plan: null, items: [] },
  },
  {
    name: 'replacing an older Plan makes it current',
    rows: [replacedOld, removedCurrent],
    expected: { plan: oldPlan.plan, items: [] },
  },
])('$name', ({ rows, expected }) => {
  expect(toFeedView(rows, snapshot)).toEqual(expected);
});
