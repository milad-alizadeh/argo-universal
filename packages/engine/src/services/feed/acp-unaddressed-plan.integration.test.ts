import { expect, it } from 'vitest';
import { waitFor } from 'xstate';
import {
  openAcpFeedSession,
  waitForAcpSessionIdle,
  type AcpFeedUpdates,
} from '#mocks/acp-feed';
import { findSessionActor } from '../sessions';

it('unaddressed Plans reuse their local identity through successive Turns and close/reopen', async () => {
  const updates: AcpFeedUpdates = [
    {
      sessionUpdate: 'plan',
      entries: [{ content: 'First', priority: 'high', status: 'pending' }],
    },
  ];
  const { host, sessionId } = await openAcpFeedSession(updates);
  const first = (await host.caller.feed.page({ sessionId, direction: 'tail' }))
    .rows[1];
  updates.splice(0, 1, {
    sessionUpdate: 'plan',
    entries: [{ content: 'Replacement', priority: 'low', status: 'completed' }],
  });
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Replace the checklist' }],
  });
  await waitForAcpSessionIdle(host, sessionId);
  const actor = findSessionActor(host.engine.system, sessionId);
  if (!actor) throw new Error('Session is missing');
  await host.caller.session.close({ sessionId });
  await waitFor(actor, (snapshot) => snapshot.status === 'done');
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
