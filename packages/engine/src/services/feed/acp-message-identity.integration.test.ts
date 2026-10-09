import { expect, it } from 'vitest';
import {
  openAcpFeedSession,
  waitForAcpSessionIdle,
  type AcpFeedUpdates,
} from '#mocks/acp-feed';

it('an explicit message identity patches its original Turn after settled persistence', async () => {
  const updates: AcpFeedUpdates = [
    {
      sessionUpdate: 'agent_message_chunk',
      messageId: 'shared',
      content: { type: 'text', text: 'First 😀' },
    },
  ];
  const { host, sessionId } = await openAcpFeedSession(updates);
  const first = await host.caller.feed.page({ sessionId, direction: 'tail' });
  updates.splice(0, 1, {
    sessionUpdate: 'agent_message_chunk',
    messageId: 'shared',
    content: { type: 'text', text: ' continued' },
  });
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
      id: first.rows[1]?.id,
      messageId: 'shared',
      turnId: first.rows[1]?.turnId,
      position: 1,
      state: 'settled',
      content: [{ type: 'text', text: 'First 😀 continued' }],
    },
  ]);
  expect(
    second.rows.filter((row) => row.sessionUpdate === 'user_message'),
  ).toHaveLength(2);
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
  expect(messages[0]?.id).not.toBe(messages[1]?.id);
  expect(messages[0]?.turnId).not.toBe(messages[1]?.turnId);
});
