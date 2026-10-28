import { SessionNewOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { askOperation } from '#mocks/operation-permissions';
import { addOtherProject } from '#mocks/session-access';
import { delegationJourney, holdSession } from '#mocks/session-delegation';

it('asks before prompting a direct child in another Project', async () => {
  const journey = await delegationJourney();
  const projectId = await addOtherProject(journey.host);
  await holdSession(journey, journey.caller.sessionId);
  const calling = { host: journey.host, session: journey.caller };

  const start = await askOperation(calling, {
    id: 'session.new',
    params: {
      ...emptySessionInput,
      projectId,
      prompt: [{ type: 'text', text: 'Foreign Agent' }],
    },
  });

  await journey.host.caller.session.answerPermission({
    sessionId: journey.caller.sessionId,
    requestId: start.request.requestId,
    optionId: 'allow_once',
  });
  const [result] = await start.outcome;

  const target = SessionNewOutput.parse(
    result?.status === 'fulfilled' ? result.value : null,
  );

  await waitForAcpSessionIdle(journey.host, target.sessionId);

  const asked = await askOperation(calling, {
    id: 'session.prompt',
    params: {
      ...target,
      prompt: [{ type: 'text', text: 'Continue foreign work' }],
    },
  });

  await journey.host.caller.session.answerPermission({
    sessionId: journey.caller.sessionId,
    requestId: asked.request.requestId,
    optionId: 'reject_once',
  });
  expect(await asked.outcome).toMatchObject([
    { status: 'rejected', reason: { message: 'The user refused' } },
  ]);
  expect(await journey.host.caller.session.get(target)).toMatchObject({
    state: 'idle',
    startedBySessionId: journey.caller.sessionId,
    projectId,
  });
});
