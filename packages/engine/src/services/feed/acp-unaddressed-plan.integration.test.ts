import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import { expect, it } from 'vitest';
import {
  openAcpFeedSession,
  waitForAcpSessionIdle,
  type AcpFeedUpdates,
} from '#mocks/acp-feed';

it('unaddressed Plans reuse their local identity through successive Turns and close/reopen', async () => {
  const updates: AcpFeedUpdates = [
    {
      sessionUpdate: 'plan',
      entries: [{ content: 'First', priority: 'high', status: 'pending' }],
    },
  ];
  const scenario = feedScenario(updates);
  const { host, sessionId } = await openAcpFeedSession(scenario);
  const first = (await host.caller.feed.page({ sessionId, direction: 'tail' }))
    .rows[1];
  scenario.steps = feedScenario([
    {
      sessionUpdate: 'plan',
      entries: [
        { content: 'Replacement', priority: 'low', status: 'completed' },
      ],
    },
  ]).steps;
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Replace the checklist' }],
  });
  await waitForAcpSessionIdle(host, sessionId);
  await host.caller.session.close({ sessionId });
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Resume this Session' }],
  });
  await waitForAcpSessionIdle(host, sessionId);
  const plans = (
    await host.caller.feed.page({ sessionId, direction: 'tail' })
  ).rows.filter((row) => row.sessionUpdate === 'plan_update');
  expect(plans).toMatchObject([
    {
      id: first?.id,
      position: 1,
      turnId: first?.turnId,
      plan: { type: 'items', entries: [{ content: 'Replacement' }] },
      _meta: {
        argo: { unaddressedPlanAcpSessionId: 'owned-1', removed: false },
      },
    },
  ]);
});
