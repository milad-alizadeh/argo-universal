import type { PromptRequest } from '@agentclientprotocol/sdk';
import { OperationExecution } from '@repo/contracts/operations';
import { assert, expect, it } from 'vitest';
import { z } from 'zod';
import { runOperation } from '#mocks/operations';
import { delegationJourney, startDelegated } from '#mocks/session-delegation';

// Where each Prompt landed, as its execution says beside the Session it went to.
const Landed = z.looseObject({
  status: z.enum(['started', 'steered', 'queued']),
});

it('starts one of two concurrent Session-sent prompts to the same idle child and queues the other behind it', async () => {
  const requests: PromptRequest[] = [];
  const journey = await delegationJourney({ requests });
  const target = await startDelegated(journey);

  const prompts = [
    [{ type: 'text', text: 'First steering prompt' }],
    [{ type: 'text', text: 'Second steering prompt' }],
  ];

  const receipts = await Promise.all(
    prompts.map(async (prompt) =>
      OperationExecution.parse(
        await runOperation(journey.caller.caller.operations, {
          id: 'session.prompt',
          params: { sessionId: target.sessionId, prompt },
        }),
      ),
    ),
  );

  const landed = receipts.map((receipt) => Landed.parse(receipt.result).status);

  expect(landed).toHaveLength(2);
  expect(landed).toEqual(expect.arrayContaining(['started', 'queued']));

  const startedAt = landed.indexOf('started');
  const admitted = prompts[startedAt];
  const receipt = receipts[startedAt];
  assert(receipt?.turn);

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
