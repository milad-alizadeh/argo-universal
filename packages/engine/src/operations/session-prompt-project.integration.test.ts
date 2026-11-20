import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { runOperation } from '#mocks/operations';
import { addOtherProject } from '#mocks/session-access';
import { delegationJourney } from '#mocks/session-delegation';

it('prompts an independently started Session in another Project without approval', async () => {
  const { caller, host } = await delegationJourney();
  const projectId = await addOtherProject(host);

  const target = await host.caller.session.new({
    ...emptySessionInput,
    projectId,
    prompt: [{ type: 'text', text: 'Foreign work' }],
  });

  await waitForAcpSessionIdle(host, target.sessionId);

  await expect(
    runOperation(caller.caller.operations, {
      id: 'session.prompt',
      params: {
        ...target,
        prompt: [{ type: 'text', text: 'Continue foreign work' }],
      },
    }),
  ).resolves.toMatchObject({ turn: { sessionId: target.sessionId } });
});
