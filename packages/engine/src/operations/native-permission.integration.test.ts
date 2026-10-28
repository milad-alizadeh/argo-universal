import { expect, it } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  answerPermission,
  askArchive,
  permissionJourney,
  permissionRow,
} from '#mocks/native-permission';
import { probeAutoAllow } from '#mocks/native-permission-probe';

it('asks despite bypass mode and an auto-allow Plugin, then archives through the same Operation Tool call', async () => {
  const journey = await permissionJourney();
  const { request, outcome } = await askArchive(journey);
  expect(request).toMatchObject({
    title: 'Archive Session',
    operation: { id: 'session.archive' },
  });
  const row = await permissionRow(journey, request);
  expect(row).toMatchObject({
    status: 'in_progress',
    toolCallId: request.toolCallId,
  });
  const probe = await probeAutoAllow(journey, request);

  await answerPermission(journey, request, 'allow_once');
  await probe.completion;
  expect(probe.answers).toEqual([
    { outcome: { outcome: 'selected', optionId: 'allow_once' } },
  ]);
  expect(await outcome).toEqual([{ status: 'fulfilled', value: {} }]);
  expect(await permissionRow(journey, request)).toMatchObject({
    id: row.id,
    status: 'completed',
    _meta: {
      argo: {
        permissionOutcome: { outcome: 'selected', optionId: 'allow_once' },
      },
    },
  });
  const archived = await journey.host.caller.session.list({ archived: true });
  expect(archived.sessions).toContainEqual(
    expect.objectContaining(journey.target),
  );
}, 30_000);

it('denies with the exact refusal and records it without archiving the target', async () => {
  const journey = await permissionJourney();
  const { request, outcome } = await askArchive(journey);
  await answerPermission(journey, request, 'reject_once');
  expect(await outcome).toMatchObject([
    { status: 'rejected', reason: { message: 'The user refused' } },
  ]);
  expect(await permissionRow(journey, request)).toMatchObject({
    status: 'failed',
    rawOutput: { error: 'The user refused' },
    _meta: {
      argo: {
        permissionOutcome: { outcome: 'selected', optionId: 'reject_once' },
      },
    },
  });
  expect(
    (await journey.host.caller.session.list({ archived: false })).sessions,
  ).toContainEqual(expect.objectContaining(journey.target));
}, 30_000);

it('refuses confirmation without an active Turn instead of leaving a waiting call', async () => {
  const journey = await permissionJourney();
  await expect(
    journey.session.caller.operations.run.mutate({
      id: 'session.archive',
      params: journey.target,
    }),
  ).rejects.toMatchObject({
    message: 'A Permission request requires an active Turn',
    data: { code: 'CONFLICT' },
  });

  const snapshot = await waitForAcpSnapshot(
    journey.host,
    journey.session.sessionId,
    () => true,
  );

  expect(snapshot.pendingPermission).toBeNull();
}, 30_000);
