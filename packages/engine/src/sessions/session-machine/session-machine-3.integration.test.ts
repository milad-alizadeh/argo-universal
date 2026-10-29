import type {
  RequestPermissionResponse,
  CreateElicitationResponse,
} from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import { promptInput, mixedQuestions } from './session-machine.test.mocks';

it('cancellation settles both question queues while its prompt waits for Agent completion', async () => {
  const permissions: RequestPermissionResponse[] = [];
  const elicitations: CreateElicitationResponse[] = [];
  const completion = Promise.withResolvers<void>();
  const scenario = mixedQuestions(permissions, elicitations);

  const host = await startAcpEngine({
    ...scenario,
    steps: [
      ...scenario.steps.slice(0, -1),
      { type: 'gate', waitFor: completion.promise },
    ],
  });

  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({ ...created, prompt: promptInput });
  await waitForAcpSnapshot(
    host,
    created.sessionId,
    (snapshot) =>
      snapshot.pendingPermission !== null &&
      snapshot.pendingElicitation !== null,
  );
  await host.caller.session.cancel(created);
  await expect
    .poll(() => ({ permissions, elicitations }))
    .toEqual({
      permissions: [
        { outcome: { outcome: 'cancelled' } },
        { outcome: { outcome: 'cancelled' } },
      ],
      elicitations: [{ action: 'cancel' }],
    });
  expect(
    await waitForAcpSnapshot(
      host,
      created.sessionId,
      (snapshot) =>
        snapshot.pendingPermission === null &&
        snapshot.pendingElicitation === null,
    ),
  ).toMatchObject({
    state: 'idle',
    activeTurnId: null,
  });
  completion.resolve();
  await waitForAcpSessionIdle(host, created.sessionId);
  expect(
    await waitForAcpSnapshot(host, created.sessionId, () => true),
  ).toMatchObject({ activeTurnId: null });
});
