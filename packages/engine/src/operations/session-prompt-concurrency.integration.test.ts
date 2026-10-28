import type { PromptRequest } from '@agentclientprotocol/sdk';
import { OperationExecution } from '@repo/contracts/operations';
import { assert, expect, it } from 'vitest';
import { delegationJourney, startDelegated } from '#mocks/session-delegation';

it('admits one concurrent Session-sent prompt to the same idle child with a matching acknowledgement', async () => {
  const requests: PromptRequest[] = [];
  const journey = await delegationJourney({ requests });
  const target = await startDelegated(journey);

  const prompts = [
    [{ type: 'text', text: 'First steering prompt' }],
    [{ type: 'text', text: 'Second steering prompt' }],
  ];

  const outcomes = await Promise.allSettled(
    prompts.map((prompt) =>
      journey.caller.caller.operations.run.mutate({
        id: 'session.prompt',
        params: { sessionId: target.sessionId, prompt },
      }),
    ),
  );

  expect(outcomes.map((result) => result.status).sort()).toEqual([
    'fulfilled',
    'rejected',
  ]);
  expect(outcomes.find((result) => result.status === 'rejected')).toMatchObject(
    { reason: { data: { code: 'CONFLICT' } } },
  );

  const first = outcomes[0];
  assert(first);
  const admitted = first.status === 'fulfilled' ? prompts[0] : prompts[1];
  const accepted = outcomes.find((result) => result.status === 'fulfilled');
  assert(accepted?.status === 'fulfilled');
  const receipt = OperationExecution.parse(accepted.value);
  assert(receipt.turn);

  const admittedPage = await journey.host.caller.feed.page({
    sessionId: target.sessionId,
    direction: 'tail',
  });

  const message = admittedPage.rows.find(
    (row) =>
      row.turnId === receipt.turn?.id && row.sessionUpdate === 'prompt_message',
  );

  assert(message);
  expect(
    await journey.host.caller.feed.row({
      sessionId: target.sessionId,
      id: message.id,
    }),
  ).toMatchObject({ content: admitted });

  const page = await journey.host.caller.feed.page({
    sessionId: target.sessionId,
    direction: 'tail',
  });

  expect(
    page.rows.filter((row) => row.sessionUpdate === 'prompt_message'),
  ).toHaveLength(2);
  expect(page.rows.at(-1)).toMatchObject({
    content: admitted,
    _meta: { argo: { sender: { sessionId: journey.caller.sessionId } } },
  });
  await journey.host.caller.session.cancel({ sessionId: target.sessionId });
  await expect
    .poll(() => requests.slice(2))
    .toEqual([{ sessionId: expect.any(String), prompt: admitted }]);
});
