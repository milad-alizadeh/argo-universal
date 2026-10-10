import type { FeedSubscribeOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { startSessionJourney } from '#mocks/session-journey';

it('keeps the Session failure when the registry removes a Session during its Feed subscription', async (): Promise<void> => {
  const host = await startSessionJourney();
  const { caller, agent } = host;
  await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Start a Turn' }],
  });
  const updates = (
    await caller.feed.subscribe({ sessionId: 'session-1', after: null })
  )[Symbol.asyncIterator]();
  await updates.next();
  for (const index of [0, 1]) {
    requireScriptedProcessAt(agent.processes, index).disconnect();
    await expect
      .poll(() => agent.processes.length, { timeout: 10000 })
      .toBe(index + 2);
    await waitForAcpSessionIdle(host, 'session-1');
  }
  requireScriptedProcessAt(agent.processes, 2).disconnect();
  let last: FeedSubscribeOutput | undefined;
  for await (const event of {
    [Symbol.asyncIterator]: (): typeof updates => updates,
  })
    last = event;
  expect(last).toEqual({
    type: 'closed',
    failure: 'The Agent stopped three times in ten minutes',
  });
});
