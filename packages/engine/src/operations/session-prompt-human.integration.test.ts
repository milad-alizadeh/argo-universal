import type { FeedUpdate } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import { assert, expect, it } from 'vitest';
import { operationCaller } from '#mocks/operations';
import { delegationJourney, startDelegated } from '#mocks/session-delegation';

const promptOperation = 'session.prompt';

type HumanPrompt = {
  sessionId: string;
  prompt: { type: 'text'; text: string }[];
};

type Journey = Awaited<ReturnType<typeof delegationJourney>>;

it.each(['App', 'user token'] as const)(
  'keeps human %s prompts and rejects forged sender params before prompting a direct child',
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

    const message = await { App: appMessage, 'user token': terminalMessage }[
      origin
    ](journey, input);

    expect(message).toMatchObject({
      sessionUpdate: 'user_message',
      _meta: { argo: { sender: { type: 'user' } } },
    });
  },
);

async function appMessage(
  journey: Journey,
  input: HumanPrompt,
): Promise<FeedUpdate> {
  const result = await journey.host.caller.session.prompt(input);
  expect(Object.keys(result)).toEqual(['messageId']);

  return journey.host.caller.feed.row({
    sessionId: input.sessionId,
    id: result.messageId ?? '',
  });
}

async function terminalMessage(
  journey: Journey,
  input: HumanPrompt,
): Promise<FeedUpdate> {
  const user = await operationCaller(journey.host);

  const result = OperationExecution.parse(
    await user.operations.run.mutate({ id: promptOperation, params: input }),
  );

  expect(result.turn).toMatchObject({ sessionId: input.sessionId });

  const page = await journey.host.caller.feed.page({
    sessionId: input.sessionId,
    direction: 'tail',
  });

  const row = page.rows.find(
    (value) =>
      value.turnId === result.turn?.id &&
      value.sessionUpdate === 'user_message',
  );

  assert(row);

  return row;
}
