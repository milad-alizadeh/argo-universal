import { assert, expect, it } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  answerPermission,
  askArchive,
  permissionJourney,
  permissionRow,
} from '#mocks/native-permission';
import { nextOperationRow } from '#mocks/operation-rows';

it('queues Argo requests in order and exposes only the next request after the first answer', async () => {
  const journey = await permissionJourney();
  const first = await askArchive(journey);
  const { host, session, target } = journey;

  const events = await host.caller.feed.subscribe({
    sessionId: session.sessionId,
    after: null,
  });

  const second = Promise.allSettled([
    session.caller.operations.run.mutate({
      id: 'session.archive',
      params: target,
    }),
  ]);

  const secondRow = await nextOperationRow(events, first.request.toolCallId);
  const secondToolCallId = secondRow.toolCallId;

  const snapshot = await waitForAcpSnapshot(
    host,
    session.sessionId,
    () => true,
  );

  expect(snapshot.pendingPermission?.requestId).toBe(first.request.requestId);
  await answerPermission(journey, first.request, 'reject_once');
  expect(await first.outcome).toMatchObject([
    { status: 'rejected', reason: { message: 'The user refused' } },
  ]);

  const next = await waitForAcpSnapshot(
    host,
    session.sessionId,
    (value) => value.pendingPermission?.toolCallId === secondToolCallId,
  );

  assert(next.pendingPermission);
  await expect(
    answerPermission(journey, first.request, 'allow_once'),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
  await answerPermission(journey, next.pendingPermission, 'allow_once');
  expect(await second).toEqual([{ status: 'fulfilled', value: {} }]);
  expect(await permissionRow(journey, first.request)).toMatchObject({
    status: 'failed',
  });
  expect(await permissionRow(journey, next.pendingPermission)).toMatchObject({
    status: 'completed',
  });
}, 30_000);
