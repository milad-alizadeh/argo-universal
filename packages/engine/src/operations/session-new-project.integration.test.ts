import { SessionNewOutput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { askOperation } from '#mocks/operation-permissions';
import { addOtherProject } from '#mocks/session-access';
import { delegationJourney, holdSession } from '#mocks/session-delegation';

it('asks for another Project even when the calling Session owns the started Agent', async () => {
  const journey = await delegationJourney();
  const projectId = await addOtherProject(journey.host);
  await holdSession(journey, journey.caller.sessionId);
  const calling = { host: journey.host, session: journey.caller };

  const operation = {
    id: 'session.new' as const,
    params: {
      ...emptySessionInput,
      projectId,
      prompt: [{ type: 'text', text: 'Foreign investigation' }],
    },
  };

  const denied = await askOperation(calling, operation);
  await journey.host.caller.session.answerPermission({
    sessionId: journey.caller.sessionId,
    requestId: denied.request.requestId,
    optionId: 'reject_once',
  });
  expect(await denied.outcome).toMatchObject([
    { status: 'rejected', reason: { message: 'The user refused' } },
  ]);
  expect(await journey.host.caller.session.list({ projectId })).toMatchObject({
    sessions: [],
  });

  const allowed = await askOperation(calling, operation);
  await journey.host.caller.session.answerPermission({
    sessionId: journey.caller.sessionId,
    requestId: allowed.request.requestId,
    optionId: 'allow_once',
  });
  const [result] = await allowed.outcome;

  const created = SessionNewOutput.parse(
    OperationExecution.parse(
      result?.status === 'fulfilled' ? result.value : null,
    ).result,
  );

  expect(await journey.host.caller.session.get(created)).toMatchObject({
    projectId,
    startedBySessionId: journey.caller.sessionId,
  });
  await waitForAcpSessionIdle(journey.host, created.sessionId);
  await holdSession(journey, created.sessionId);

  const cancel = await askOperation(calling, {
    id: 'session.cancel',
    params: created,
  });

  await journey.host.caller.session.answerPermission({
    sessionId: journey.caller.sessionId,
    requestId: cancel.request.requestId,
    optionId: 'reject_once',
  });
  expect(await cancel.outcome).toMatchObject([{ status: 'rejected' }]);
  expect(await journey.host.caller.session.get(created)).toMatchObject({
    state: 'running',
  });
});
