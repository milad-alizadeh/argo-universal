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
it('the active Plan follows content revisions, keeps read-only Plans visible and ignores a later removal of an older Plan', () => {
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
  expect(toFeedView([removedOld, current], snapshot)).toEqual({
    plan: current.plan,
    items: [{ type: 'row', row: current }],
  });
  const removedCurrent = {
    ...current,
    revision: 5,
    _meta: { argo: { contentRevision: 2, removed: true } },
  };
  expect(toFeedView([removedOld, removedCurrent], snapshot)).toEqual({
    plan: null,
    items: [],
  });
  const replacedOld: PlanUpdate = {
    ...oldPlan,
    revision: 6,
    _meta: { argo: { contentRevision: 6, removed: false } },
  };
  expect(toFeedView([replacedOld, removedCurrent], snapshot).plan).toEqual(
    oldPlan.plan,
  );
});
