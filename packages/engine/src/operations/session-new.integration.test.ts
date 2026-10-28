import { SessionNewOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { operationCaller } from '#mocks/operations';
import { startSessionJourney } from '#mocks/session-journey';

it('starts a Session through the user-token Operation and generated App procedure', async () => {
  const host = await startSessionJourney();
  const user = await operationCaller(host);

  const created = SessionNewOutput.parse(
    await user.operations.run.mutate({
      id: 'session.new',
      params: {
        ...emptySessionInput,
        prompt: [{ type: 'text', text: 'Delegated investigation' }],
      },
    }),
  );

  await user.session.cancel.mutate(created);
  await waitForAcpSessionIdle(host, created.sessionId);
  expect(await user.session.get.query(created)).toMatchObject({
    projectId: 'project-1',
    title: 'Delegated investigation',
  });
  expect(await host.caller.session.new(emptySessionInput)).toMatchObject({
    sessionId: expect.any(String),
  });
});
