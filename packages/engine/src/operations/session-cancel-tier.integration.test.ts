import { expect, it } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { permissionJourney } from '#mocks/native-permission';
import { beginHeldTurn } from '#mocks/operation-race';
import { runOperation } from '#mocks/operations';

it('cancels the calling Session as act without asking', async () => {
  const { host, session } = await permissionJourney();
  await beginHeldTurn(host, session.sessionId);
  await expect(
    runOperation(session.caller.operations, {
      id: 'session.cancel',
      params: { sessionId: session.sessionId },
    }),
  ).resolves.toEqual({});
  await waitForAcpSessionIdle(host, session.sessionId);
}, 30_000);

it('cancels an independently started Session without asking', async () => {
  const { host, session, target } = await permissionJourney();
  await beginHeldTurn(host, target.sessionId);

  await expect(
    runOperation(session.caller.operations, {
      id: 'session.cancel',
      params: target,
    }),
  ).resolves.toEqual({});

  await waitForAcpSessionIdle(host, target.sessionId);
}, 30_000);
