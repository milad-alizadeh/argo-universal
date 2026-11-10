import { RequestError } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

it('a Session that failed a Turn is no longer Failed once a later Turn ends well', async () => {
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        {
          error: RequestError.internalError(
            undefined,
            'Boom',
          ).toErrorResponse(),
        },
        { result: { stopReason: 'end_turn' } },
      ],
    },
  });

  const session = await host.caller.session.new(emptySessionInput);

  const status = async (): Promise<string | undefined> =>
    (await host.caller.session.list({ archived: false })).sessions.find(
      (row) => row.sessionId === session.sessionId,
    )?.status;

  await host.caller.session.prompt({
    ...session,
    prompt: [{ type: 'text', text: 'Fail' }],
  });
  await waitForAcpSessionIdle(host, session.sessionId);
  expect(await status()).toBe('failed');

  await host.caller.session.prompt({
    ...session,
    prompt: [{ type: 'text', text: 'Recover' }],
  });
  await waitForAcpSessionIdle(host, session.sessionId);
  expect(await status()).not.toBe('failed');
});
