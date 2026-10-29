import { assert, expect, it } from 'vitest';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  permissionJourney,
  answerPermission,
  permissionRow,
} from '#mocks/native-permission';
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

it('asks before cancelling an unrelated Session in the same Project', async () => {
  const journey = await permissionJourney();
  const { host, session, target } = journey;
  await beginHeldTurn(host, session.sessionId);
  await beginHeldTurn(host, target.sessionId);

  const outcome = Promise.allSettled([
    runOperation(session.caller.operations, {
      id: 'session.cancel',
      params: target,
      wait: true,
    }),
  ]);

  const pending = waitForAcpSnapshot(
    host,
    session.sessionId,
    (value) => value.pendingPermission !== null,
  );

  expect(await Promise.race([pending.then(() => 'permission'), outcome])).toBe(
    'permission',
  );
  const { pendingPermission: request } = await pending;
  assert(request);
  expect(request.title).toBe('Cancel Session');
  await answerPermission(journey, request, 'allow_once');
  expect(await outcome).toEqual([{ status: 'fulfilled', value: {} }]);
  await waitForAcpSessionIdle(host, target.sessionId);
  const caller = await waitForAcpSnapshot(host, session.sessionId, () => true);
  expect(caller.activeTurnId).toEqual(expect.any(String));
  expect(await permissionRow(journey, request)).toMatchObject({
    status: 'completed',
  });
}, 30_000);
