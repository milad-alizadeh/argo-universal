import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import {
  openAcpFeedSession,
  waitForAcpSessionIdle,
  type AcpFeedUpdates,
} from '#mocks/acp-feed';

it('unaddressed Plans never adopt addressed rows or another actual ACP Session', async () => {
  const updates: AcpFeedUpdates = [{ sessionUpdate: 'plan', entries: [] }];
  const scenario = feedScenario(updates);
  const { host, sessionId } = await openAcpFeedSession(scenario);
  const first = (await host.caller.feed.page({ sessionId, direction: 'tail' }))
    .rows[1];
  if (!first) throw new Error('Unaddressed Plan is missing');
  scenario.steps = feedScenario([
    {
      sessionUpdate: 'plan_update',
      plan: {
        type: 'items',
        planId: first.id,
        entries: [
          { content: 'Addressed', priority: 'high', status: 'pending' },
        ],
      },
    },
    ...updates,
  ]).steps;
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Both Plans' }],
  });
  await waitForAcpSessionIdle(host, sessionId);
  const sibling = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Sibling Plans' }],
  });
  await waitForAcpSessionIdle(host, sibling.sessionId);
  const firstPlans = (
    await host.caller.feed.page({ sessionId, direction: 'tail' })
  ).rows.filter((row) => row.sessionUpdate === 'plan_update');
  const siblingPlans = (
    await host.caller.feed.page({ ...sibling, direction: 'tail' })
  ).rows.filter((row) => row.sessionUpdate === 'plan_update');
  expect(firstPlans).toMatchObject([
    {
      id: first.id,
      position: 1,
      turnId: first.turnId,
      _meta: { argo: { unaddressedPlanAcpSessionId: 'owned-1' } },
    },
    { plan: { planId: first.id, entries: [{ content: 'Addressed' }] } },
  ]);
  expect(siblingPlans).toHaveLength(2);
  expect(
    new Set([...firstPlans, ...siblingPlans].map((row) => row.id)).size,
  ).toBe(4);
  expect(siblingPlans[1]?._meta?.argo?.unaddressedPlanAcpSessionId).toBe(
    'owned-2',
  );
});
