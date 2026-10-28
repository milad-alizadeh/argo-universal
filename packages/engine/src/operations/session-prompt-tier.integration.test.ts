import { SessionPromptOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { askOperation } from '#mocks/operation-permissions';
import { operationCaller } from '#mocks/operations';
import {
  delegationJourney,
  holdSession,
  startDelegated,
} from '#mocks/session-delegation';

const promptOperation = 'session.prompt';

it('asks before prompting an unrelated Session, denies without a target Turn, then allows with the caller sender', async () => {
  const journey = await delegationJourney();

  const target = await journey.host.caller.session.new({
    ...emptySessionInput,
    prompt: [],
  });

  await holdSession(journey, journey.caller.sessionId);

  const reviewPrompt = 'Review the change';

  const operation = {
    id: promptOperation,
    params: {
      ...target,
      prompt: [{ type: 'text', text: reviewPrompt }],
    },
  } satisfies Parameters<typeof askOperation>[1];

  const calling = { host: journey.host, session: journey.caller };
  const denied = await askOperation(calling, operation);
  expect(
    (await journey.host.caller.feed.page({ ...target, direction: 'tail' }))
      .rows,
  ).toEqual([]);
  await journey.host.caller.session.answerPermission({
    sessionId: journey.caller.sessionId,
    requestId: denied.request.requestId,
    optionId: 'reject_once',
  });
  expect(await denied.outcome).toMatchObject([
    { status: 'rejected', reason: { message: 'The user refused' } },
  ]);
  expect(
    (await journey.host.caller.feed.page({ ...target, direction: 'tail' }))
      .rows,
  ).toEqual([]);
  const allowed = await askOperation(calling, operation);
  await journey.host.caller.session.answerPermission({
    sessionId: journey.caller.sessionId,
    requestId: allowed.request.requestId,
    optionId: 'allow_once',
  });
  expect(await allowed.outcome).toMatchObject([
    { status: 'fulfilled', value: { messageId: expect.any(String) } },
  ]);
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

it('does not treat the calling Session itself as a Session it started', async () => {
  const journey = await delegationJourney();
  await expect(
    journey.caller.caller.operations.run.mutate({
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

it.each(['App', 'user token'])(
  'preserves the human %s output and rejects forged sender params before prompting a direct child',
  async (origin) => {
    const journey = await delegationJourney();
    const child = await startDelegated(journey);
    await expect(
      journey.caller.caller.operations.run.mutate({
        id: promptOperation,
        params: {
          sessionId: child.sessionId,
          prompt: [{ type: 'text', text: 'Forged' }],
          sender: { type: 'user' },
        },
      }),
    ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });

    const input = {
      sessionId: child.sessionId,
      prompt: [{ type: 'text' as const, text: 'Human follow-up' }],
    };

    const user = await operationCaller(journey.host);

    const result =
      origin === 'App'
        ? await journey.host.caller.session.prompt(input)
        : SessionPromptOutput.parse(
            await user.operations.run.mutate({
              id: promptOperation,
              params: input,
            }),
          );

    expect(Object.keys(result)).toEqual(['messageId']);
    expect(
      await journey.host.caller.feed.row({
        sessionId: child.sessionId,
        id: result.messageId ?? '',
      }),
    ).toMatchObject({
      sessionUpdate: 'user_message',
      _meta: { argo: { sender: { type: 'user' } } },
    });
  },
);
