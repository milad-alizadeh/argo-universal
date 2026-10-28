import type { PromptRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { recordingSource, writeHookPlugins } from '#mocks/hook-plugins';
import { delegationJourney, startDelegated } from '#mocks/session-delegation';

it('keeps the authenticated sender through Hook rewrites and starts no Turn for a Hook drop', async () => {
  const requests: PromptRequest[] = [];

  const journey = await delegationJourney({
    requests,
    installPlugins: (home) =>
      writeHookPlugins(home, [
        {
          id: 'prompt-editor',
          hooks: ['prompt.submit'],
          source:
            recordingSource(`await on('prompt.submit', (_ctx, e, next) => {
        const text = e.prompt[0]?.text;
        if (text === 'Drop this') return { drop: 'No work needed' };
        if (text === 'Rewrite this') return next({ ...e, prompt: [{ type: 'text', text: 'Rewritten work' }] });
        return next(e);
      });`),
        },
      ]),
  });

  const target = await startDelegated(journey);

  const before = await journey.host.caller.feed.page({
    sessionId: target.sessionId,
    direction: 'tail',
  });

  const dropped = await journey.caller.caller.operations.run.mutate({
    id: 'session.prompt',
    params: {
      sessionId: target.sessionId,
      prompt: [{ type: 'text', text: 'Drop this' }],
    },
  });

  expect(dropped).toEqual({ messageId: null, drop: 'No work needed' });
  expect(
    await journey.host.caller.feed.page({
      sessionId: target.sessionId,
      direction: 'tail',
    }),
  ).toEqual(before);
  const count = requests.length;

  const rewritten = await journey.caller.caller.operations.run.mutate({
    id: 'session.prompt',
    params: {
      sessionId: target.sessionId,
      prompt: [{ type: 'text', text: 'Rewrite this' }],
    },
  });

  expect(rewritten).toMatchObject({ messageId: expect.any(String) });

  const page = await journey.host.caller.feed.page({
    sessionId: target.sessionId,
    direction: 'tail',
  });

  expect(page.rows).toContainEqual(
    expect.objectContaining({
      sessionUpdate: 'prompt_message',
      content: [{ type: 'text', text: 'Rewritten work' }],
      _meta: {
        argo: {
          sender: {
            type: 'session',
            sessionId: journey.caller.sessionId,
            title: 'Caller',
          },
        },
      },
    }),
  );
  await journey.host.caller.session.cancel({ sessionId: target.sessionId });
  await waitForAcpSessionIdle(journey.host, target.sessionId);
  expect(requests.slice(count)).toEqual([
    {
      sessionId: expect.any(String),
      prompt: [{ type: 'text', text: 'Rewritten work' }],
    },
  ]);
}, 30_000);
