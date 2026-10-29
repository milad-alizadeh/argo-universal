import type { PromptRequest } from '@agentclientprotocol/sdk';
import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { runOperation } from '#mocks/operations';
import { delegationJourney, startDelegated } from '#mocks/session-delegation';

it('stores the authenticated Session sender for initial and subsequent ordinary Agent prompts', async () => {
  const requests: PromptRequest[] = [];
  const journey = await delegationJourney({ requests });
  const target = await startDelegated(journey);

  const initial = await journey.host.caller.feed.page({
    sessionId: target.sessionId,
    direction: 'tail',
  });

  expect(initial.rows[0]).toMatchObject({
    sessionUpdate: 'prompt_message',
    content: [{ type: 'text', text: 'Delegated work' }],
    _meta: {
      argo: {
        sender: {
          type: 'session',
          sessionId: journey.caller.sessionId,
          title: 'Caller',
        },
      },
    },
  });

  const followUp = 'Inspect the result';

  const result = await runOperation(journey.caller.caller.operations, {
    id: 'session.prompt',
    params: {
      sessionId: target.sessionId,
      prompt: [{ type: 'text', text: followUp }],
    },
  });

  const execution = OperationExecution.parse(result);
  expect(execution.turn).toMatchObject({ sessionId: target.sessionId });

  const page = await journey.host.caller.feed.page({
    sessionId: target.sessionId,
    direction: 'tail',
  });

  expect(page.rows).toContainEqual(
    expect.objectContaining({
      sessionUpdate: 'prompt_message',
      turnId: execution.turn?.id,
      content: [{ type: 'text', text: followUp }],
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

  expect(requests.slice(1)).toEqual([
    {
      sessionId: expect.any(String),
      prompt: [{ type: 'text', text: 'Delegated work' }],
    },
    {
      sessionId: expect.any(String),
      prompt: [{ type: 'text', text: followUp }],
    },
  ]);
  await journey.host.caller.session.cancel({ sessionId: target.sessionId });
  await waitForAcpSessionIdle(journey.host, target.sessionId);
  await journey.host.caller.session.rename({
    sessionId: journey.caller.sessionId,
    title: 'Renamed source',
  });
  await journey.host.caller.session.close({ sessionId: target.sessionId });

  const stored = await journey.host.caller.feed.page({
    sessionId: target.sessionId,
    direction: 'tail',
  });

  expect(
    stored.rows.filter((row) => row.sessionUpdate === 'prompt_message'),
  ).toHaveLength(2);
  expect(stored.rows[0]).toMatchObject({
    _meta: { argo: { sender: { title: 'Caller' } } },
  });
}, 30_000);
