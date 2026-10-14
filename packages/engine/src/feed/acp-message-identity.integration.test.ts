import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import { assert, expect, it, vi } from 'vitest';
import {
  openAcpFeedSession,
  waitForAcpSessionIdle,
  type AcpFeedUpdates,
} from '#mocks/acp-feed';

it('an explicit message identity preserves its settled Turn and reports a later content update', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

  const updates: AcpFeedUpdates = [
    {
      sessionUpdate: 'agent_message_chunk',
      messageId: 'shared',
      content: { type: 'text', text: 'First 😀' },
    },
  ];

  const scenario = feedScenario(updates);
  const { host, sessionId } = await openAcpFeedSession(scenario);
  const first = await host.caller.feed.page({ sessionId, direction: 'tail' });
  const firstMessage = first.rows[1];
  assert(firstMessage);
  scenario.steps = feedScenario([
    {
      sessionUpdate: 'agent_message_chunk',
      messageId: 'shared',
      content: { type: 'text', text: ' continued' },
    },
  ]).steps;
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Continue the entity' }],
  });
  await waitForAcpSessionIdle(host, sessionId);
  const second = await host.caller.feed.page({ sessionId, direction: 'tail' });
  expect(
    second.rows.filter((row) => row.sessionUpdate === 'agent_message'),
  ).toMatchObject([
    {
      id: firstMessage.id,
      messageId: 'shared',
      turnId: firstMessage.turnId,
      position: 1,
      revision: firstMessage.revision,
      state: 'settled',
      content: [{ type: 'text', text: 'First 😀' }],
    },
  ]);
  expect(
    second.rows.filter((row) => row.sessionUpdate === 'user_message'),
  ).toHaveLength(2);
  expect(errors.mock.calls).toEqual([
    [expect.stringContaining('ACP update belongs to a settled Turn')],
  ]);
});

it('equal idless replies in successive Turns remain distinct messages', async () => {
  const { host, sessionId } = await openAcpFeedSession([
    {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: 'Equal' },
    },
  ]);

  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Again' }],
  });
  await waitForAcpSessionIdle(host, sessionId);

  const messages = (
    await host.caller.feed.page({ sessionId, direction: 'tail' })
  ).rows.filter((row) => row.sessionUpdate === 'agent_message');

  expect(messages).toMatchObject([
    { position: 1, content: [{ text: 'Equal' }] },
    { position: 3, content: [{ text: 'Equal' }] },
  ]);
  const [first, second] = messages;
  assert(first);
  assert(second);
  expect(first.id).not.toBe(second.id);
  expect(first.turnId).not.toBe(second.turnId);
});
