import { expect, it } from 'vitest';
import {
  openAcpFeedSession,
  waitForAcpSessionIdle,
  type AcpFeedUpdates,
} from '#mocks/acp-feed';

it('Plans replace whole content and retain removed history without resurrecting an older Plan', async () => {
  const updates: AcpFeedUpdates = [
    {
      sessionUpdate: 'plan_update',
      plan: {
        type: 'items',
        planId: 'older',
        entries: [{ content: 'Old', priority: 'low', status: 'pending' }],
      },
    },
    {
      sessionUpdate: 'plan_update',
      plan: {
        type: 'items',
        planId: 'current',
        entries: [
          { content: 'First', priority: 'high', status: 'pending' },
          { content: 'Second', priority: 'medium', status: 'pending' },
        ],
      },
    },
    {
      sessionUpdate: 'plan_update',
      plan: {
        type: 'items',
        planId: 'current',
        entries: [
          { content: 'Replacement', priority: 'high', status: 'completed' },
        ],
      },
    },
    { sessionUpdate: 'plan_removed', planId: 'older' },
  ];
  const { host, sessionId } = await openAcpFeedSession(updates);
  expect(
    (await host.caller.session.list({ archived: false })).sessions[0]?.plan,
  ).toEqual({ done: 1, total: 1 });
  const before = (await host.caller.feed.page({ sessionId, direction: 'tail' }))
    .rows;
  const current = before.find(
    (row) =>
      row.sessionUpdate === 'plan_update' && row.plan.planId === 'current',
  );
  expect(current).toMatchObject({
    position: 2,
    plan: { type: 'items', entries: [{ content: 'Replacement' }] },
  });
  updates.splice(0, updates.length, {
    sessionUpdate: 'plan_removed',
    planId: 'current',
  });
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Remove the current Plan' }],
  });
  await waitForAcpSessionIdle(host, sessionId);
  expect(
    (await host.caller.session.list({ archived: false })).sessions[0]?.plan,
  ).toBeNull();
  const removed = await host.caller.feed.row({
    sessionId,
    id: current?.id ?? 'missing-current-plan',
  });
  expect(removed).toMatchObject({
    position: 2,
    turnId: current?.turnId,
    plan: { type: 'items', entries: [{ content: 'Replacement' }] },
    _meta: { argo: { removed: true, contentRevision: 4 } },
  });
});

it('an addressed Plan can replace markdown with a file reference without reading the URI', async () => {
  const { host, sessionId } = await openAcpFeedSession([
    {
      sessionUpdate: 'plan_update',
      plan: { type: 'markdown', planId: 'design', content: '# Original' },
    },
    {
      sessionUpdate: 'plan_update',
      plan: { type: 'file', planId: 'design', uri: 'file:///missing/plan.md' },
    },
  ]);
  expect(
    (await host.caller.feed.page({ sessionId, direction: 'tail' })).rows,
  ).toMatchObject([
    { sessionUpdate: 'user_message' },
    {
      sessionUpdate: 'plan_update',
      position: 1,
      plan: { type: 'file', planId: 'design', uri: 'file:///missing/plan.md' },
      _meta: { argo: { removed: false, contentRevision: 3 } },
    },
  ]);
});
