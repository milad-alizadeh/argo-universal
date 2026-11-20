import { SessionNewOutput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { runOperation } from '#mocks/operations';
import { addOtherProject } from '#mocks/session-access';
import { delegationJourney, holdSession } from '#mocks/session-delegation';

it('starts a Session in another Project and cancels its Turn without approval', async () => {
  const journey = await delegationJourney();
  const projectId = await addOtherProject(journey.host);
  const operations = journey.caller.caller.operations;

  const operation = {
    id: 'session.new' as const,
    params: {
      ...emptySessionInput,
      projectId,
      prompt: [{ type: 'text', text: 'Foreign investigation' }],
    },
  };

  const created = SessionNewOutput.parse(
    OperationExecution.parse(
      await runOperation(operations, { ...operation, wait: true }),
    ).result,
  );

  expect(await journey.host.caller.session.get(created)).toMatchObject({
    projectId,
    startedBySessionId: journey.caller.sessionId,
  });
  await waitForAcpSessionIdle(journey.host, created.sessionId);
  await holdSession(journey, created.sessionId);

  await runOperation(operations, { id: 'session.cancel', params: created });
  await waitForAcpSessionIdle(journey.host, created.sessionId);
});
