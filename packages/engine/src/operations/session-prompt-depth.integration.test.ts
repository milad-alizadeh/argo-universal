import { SessionNewOutput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { askOperation } from '#mocks/operation-permissions';
import {
  delegationJourney,
  holdSession,
  startDelegated,
} from '#mocks/session-delegation';

it('asks again when prompting an owned Agent beyond the delegation depth cap', async () => {
  const journey = await delegationJourney();
  const child = await startDelegated(journey);
  const grandchild = await startDelegated(journey, child);
  await holdSession(journey, grandchild.sessionId);
  const calling = { host: journey.host, session: grandchild };

  const creation = await askOperation(calling, {
    id: 'session.new',
    params: emptySessionInput,
  });

  await journey.host.caller.session.answerPermission({
    sessionId: grandchild.sessionId,
    requestId: creation.request.requestId,
    optionId: 'allow_once',
  });
  const [result] = await creation.outcome;

  const target = SessionNewOutput.parse(
    OperationExecution.parse(
      result?.status === 'fulfilled' ? result.value : null,
    ).result,
  );

  const asked = await askOperation(calling, {
    id: 'session.prompt',
    params: { ...target, prompt: [{ type: 'text', text: 'Deep steering' }] },
  });

  await journey.host.caller.session.answerPermission({
    sessionId: grandchild.sessionId,
    requestId: asked.request.requestId,
    optionId: 'reject_once',
  });
  expect(await asked.outcome).toMatchObject([
    { status: 'rejected', reason: { message: 'The user refused' } },
  ]);
  expect(
    (await journey.host.caller.feed.page({ ...target, direction: 'tail' }))
      .rows,
  ).toEqual([]);
});
