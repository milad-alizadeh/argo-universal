import { SessionNewOutput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import { operationCaller, runOperation } from '#mocks/operations';
import { startSessionJourney } from '#mocks/session-journey';

it('starts a Session through the user-token Operation and generated App procedure', async () => {
  const host = await startSessionJourney();
  const user = await operationCaller(host);

  const created = SessionNewOutput.parse(
    OperationExecution.parse(
      await runOperation(user.operations, {
        id: 'session.new',
        params: {
          ...emptySessionInput,
          prompt: [{ type: 'text', text: 'Delegated investigation' }],
        },
      }),
    ).result,
  );

  await expect
    .poll(async () =>
      (await host.caller.session.list({})).sessions.map(
        (value) => value.sessionId,
      ),
    )
    .toContain(created.sessionId);
  await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.activeTurnId !== null,
  );
  await host.caller.session.cancel(created);
  await waitForAcpSessionIdle(host, created.sessionId);
  expect(await host.caller.session.get(created)).toMatchObject({
    projectId: 'project-1',
    title: 'Delegated investigation',
  });
  expect(await host.caller.session.new(emptySessionInput)).toMatchObject({
    sessionId: expect.any(String),
  });
});
