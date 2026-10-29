import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { promptInput } from './session-machine.test.mocks';

it('rejected ACP requests publish warning Notices while the Turn continues accepting content', async () => {
  const host = await startAcpEngine({
    steps: [
      ...['voice', 'captcha'].map((mode) => ({
        type: 'raw' as const,
        frame: JSON.stringify({
          jsonrpc: '2.0',
          id: mode,
          method: 'elicitation/create',
          params: { mode, sessionId: '$sessionId', message: 'Unsupported' },
        }),
      })),
      {
        type: 'update',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: 'Still accepting content' },
        },
      },
      { type: 'hold' },
    ],
  });

  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({ ...created, prompt: promptInput });
  await expect
    .poll(async () => {
      const page = await host.caller.feed.page({
        ...created,
        direction: 'tail',
      });

      return page.rows.filter((row) => row.sessionUpdate === 'notice');
    })
    .toMatchObject([
      {
        severity: 'warning',
        title: 'The Agent sent an unrecognised message',
        description: 'Unknown Elicitation mode voice',
      },
      {
        severity: 'warning',
        title: 'The Agent sent an unrecognised message',
        description: 'Unknown Elicitation mode captcha',
      },
    ]);
  expect(
    await waitForAcpSnapshot(host, created.sessionId, () => true),
  ).toMatchObject({ state: 'running', usage: null });
  await expect
    .poll(async () =>
      (
        await host.caller.feed.page({ ...created, direction: 'tail' })
      ).rows.filter((row) => row.sessionUpdate === 'agent_message'),
    )
    .toMatchObject([{ content: [{ text: 'Still accepting content' }] }]);
});
