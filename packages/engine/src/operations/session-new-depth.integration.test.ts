import { SessionNewOutput } from '@repo/contracts';
import { assert, expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { askOperation } from '#mocks/operation-permissions';
import {
  delegationJourney,
  holdSession,
  startDelegated,
} from '#mocks/session-delegation';

it('allows two levels of Sessions and asks separately for every deeper start', async () => {
  const journey = await delegationJourney();
  const child = await startDelegated(journey);
  const grandchild = await startDelegated(journey, child);
  await holdSession(journey, grandchild.sessionId);
  const calling = { host: journey.host, session: grandchild };

  const operation = {
    id: 'session.new' as const,
    params: {
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'Deep investigation' }],
    },
  };

  const allowed = await askOperation(calling, operation);
  await journey.host.caller.session.answerPermission({
    sessionId: grandchild.sessionId,
    requestId: allowed.request.requestId,
    optionId: 'allow_once',
  });
  const [result] = await allowed.outcome;
  assert(result?.status === 'fulfilled');

  const created = SessionNewOutput.parse(result.value);
  expect(await journey.host.caller.session.get(created)).toMatchObject({
    startedBySessionId: grandchild.sessionId,
  });

  const denied = await askOperation(calling, operation);
  await journey.host.caller.session.answerPermission({
    sessionId: grandchild.sessionId,
    requestId: denied.request.requestId,
    optionId: 'reject_once',
  });
  expect(await denied.outcome).toMatchObject([
    { status: 'rejected', reason: { message: 'The user refused' } },
  ]);
});
