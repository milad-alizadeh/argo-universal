import { expect, it } from 'vitest';
import { runOperation } from '#mocks/operations';
import { delegationJourney, startDelegated } from '#mocks/session-delegation';

it('prompts a Session at the delegation depth limit without approval', async () => {
  const journey = await delegationJourney();
  const child = await startDelegated(journey);
  const grandchild = await startDelegated(journey, child);

  await expect(
    runOperation(child.caller.operations, {
      id: 'session.prompt',
      params: {
        sessionId: grandchild.sessionId,
        prompt: [{ type: 'text', text: 'Continue at the depth limit' }],
      },
    }),
  ).resolves.toMatchObject({ turn: { sessionId: grandchild.sessionId } });
});
