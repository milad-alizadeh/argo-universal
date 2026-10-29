import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { permissionJourney, answerPermission } from '#mocks/native-permission';
import { beginHeldTurn } from '#mocks/operation-race';
import { TestOperationWaitClock } from '#mocks/operation-wait-clock';
import { operationCaller, runOperation } from '#mocks/operations';
import { openAccessSession } from '#mocks/session-access';

const archiveOperation = 'session.archive';

it('returns a native waiting id at ninety seconds and resumes the same Permission call', async () => {
  const clock = new TestOperationWaitClock();
  const journey = await permissionJourney(clock);
  await beginHeldTurn(journey.host, journey.session.sessionId);
  let settled = false;

  const run = journey.session.caller.operations.run
    .mutate({
      id: archiveOperation,
      params: journey.target,
      wait: true,
    })
    .then((result) => {
      settled = true;

      return result;
    });

  const snapshot = await waitForAcpSnapshot(
    journey.host,
    journey.session.sessionId,
    (value) => value.pendingPermission !== null,
  );

  clock.advance(89_999);
  await Promise.resolve();
  expect(settled).toBe(false);
  clock.advance(1);
  const pending = OperationExecution.parse(await run);
  expect(pending).toMatchObject({
    kind: 'operation_execution',
    status: 'waiting_for_user',
    id: expect.any(String),
  });
  expect(snapshot.pendingPermission).not.toBeNull();

  if (!snapshot.pendingPermission)
    throw new Error('Expected a waiting Permission');
  await answerPermission(journey, snapshot.pendingPermission, 'allow_once');

  const result = await journey.session.caller.operations.wait.mutate({
    id: pending.id,
  });

  expect(result).toMatchObject({
    id: pending.id,
    status: 'settled',
    result: {},
  });
}, 30_000);

it('detaches a disconnected wait without cancelling the Permission or retaining its deadline', async () => {
  const clock = new TestOperationWaitClock();
  const journey = await permissionJourney(clock);
  await beginHeldTurn(journey.host, journey.session.sessionId);

  const pending = OperationExecution.parse(
    await runOperation(journey.session.caller.operations, {
      id: archiveOperation,
      params: journey.target,
    }),
  );

  const abort = new AbortController();

  const waiting = Promise.allSettled([
    journey.session.caller.operations.wait.mutate(
      { id: pending.id },
      { signal: abort.signal },
    ),
  ]);

  await clock.waitUntilScheduled();
  abort.abort();
  expect(await waiting).toMatchObject([{ status: 'rejected' }]);
  await expect.poll(() => clock.activeDeadlines()).toBe(0);

  const snapshot = await waitForAcpSnapshot(
    journey.host,
    journey.session.sessionId,
    (value) => value.pendingPermission !== null,
  );

  if (!snapshot.pendingPermission)
    throw new Error('Expected the original Permission');
  await answerPermission(journey, snapshot.pendingPermission, 'allow_once');
  expect(
    await journey.session.caller.operations.wait.mutate({ id: pending.id }),
  ).toMatchObject({ id: pending.id, status: 'settled', result: {} });
}, 30_000);

it('returns at the Permission request without wait and refuses borrowed or tampered ids', async () => {
  const journey = await permissionJourney();
  await beginHeldTurn(journey.host, journey.session.sessionId);

  const pending = OperationExecution.parse(
    await runOperation(journey.session.caller.operations, {
      id: archiveOperation,
      params: journey.target,
    }),
  );

  expect(pending.status).toBe('waiting_for_user');
  const otherSession = await openAccessSession(journey, 'Other caller');
  await expect(
    otherSession.caller.operations.wait.mutate({ id: pending.id }),
  ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  const foreign = await operationCaller(journey.host, 'wrong-token');
  await expect(
    foreign.operations.wait.mutate({ id: pending.id }),
  ).rejects.toMatchObject({ data: { code: 'UNAUTHORIZED' } });
  const changed = `${pending.id.slice(0, -1)}${pending.id.endsWith('0') ? '1' : '0'}`;
  await expect(
    journey.session.caller.operations.wait.mutate({ id: changed }),
  ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });
  const user = await operationCaller(journey.host);
  await journey.host.caller.session.cancel({
    sessionId: journey.session.sessionId,
  });
  expect(await user.operations.wait.mutate({ id: pending.id })).toMatchObject({
    id: pending.id,
    status: 'settled',
    cancelled: true,
  });
  await journey.host.caller.session.close({
    sessionId: journey.session.sessionId,
  });
  await expect(
    journey.session.caller.operations.wait.mutate({ id: pending.id }),
  ).rejects.toMatchObject({ data: { code: 'UNAUTHORIZED' } });
}, 30_000);
