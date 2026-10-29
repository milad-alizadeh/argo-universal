import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

const userMessage = {
  sessionUpdate: 'user_message',
  _meta: { argo: { sender: { type: 'user' } } },
};

it('starts and prompts a Session from the App as the user, with no Operation Tool call', async () => {
  const host = await startAcpEngine();

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'From the App' }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);

  const prompted = await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'App follow-up' }],
  });

  expect(Object.keys(prompted)).toEqual(['messageId']);
  await waitForAcpSessionIdle(host, created.sessionId);
  expect(await host.caller.session.get(created)).toMatchObject({
    startedBySessionId: null,
  });

  const { rows } = await host.caller.feed.page({
    ...created,
    direction: 'tail',
  });

  expect(
    rows.filter(({ sessionUpdate }) => sessionUpdate === 'user_message'),
  ).toEqual([
    expect.objectContaining(userMessage),
    expect.objectContaining(userMessage),
  ]);
  expect(
    rows.filter(({ sessionUpdate }) => sessionUpdate.startsWith('tool_call')),
  ).toEqual([]);
});
