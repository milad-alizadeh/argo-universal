import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { runOperation } from '#mocks/operations';
import { delegationJourney, holdSession } from '#mocks/session-delegation';

const promptOperation = 'session.prompt';

it('prompts an unrelated Session in its own Project without asking, as the calling Session', async () => {
  const journey = await delegationJourney();

  const target = await journey.host.caller.session.new({
    ...emptySessionInput,
    prompt: [],
  });

  await holdSession(journey, journey.caller.sessionId);

  const sent = await runOperation(journey.caller.caller.operations, {
    wait: true,
    id: promptOperation,
    params: {
      ...target,
      prompt: [{ type: 'text', text: 'Review the change' }],
    },
  });

  expect(OperationExecution.parse(sent)).toMatchObject({
    turn: { sessionId: target.sessionId },
  });
  await waitForAcpSessionIdle(journey.host, target.sessionId);
  expect(
    (await journey.host.caller.feed.page({ ...target, direction: 'tail' }))
      .rows,
  ).toContainEqual(
    expect.objectContaining({
      sessionUpdate: 'prompt_message',
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
}, 30_000);

it('asks before a Session prompts itself, which its own live Turn cannot answer', async () => {
  const journey = await delegationJourney();
  await expect(
    runOperation(journey.caller.caller.operations, {
      id: promptOperation,
      params: {
        sessionId: journey.caller.sessionId,
        prompt: [{ type: 'text', text: 'Continue' }],
      },
    }),
  ).rejects.toMatchObject({
    message: 'A Permission request requires an active Turn',
  });
});
