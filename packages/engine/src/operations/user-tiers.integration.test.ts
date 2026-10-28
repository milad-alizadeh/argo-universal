import { expect, it } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { permissionJourney } from '#mocks/native-permission';
import { operationCaller } from '#mocks/operations';

it('runs read, act and confirm with the user token without asking a Session', async () => {
  const journey = await permissionJourney();
  const user = await operationCaller(journey.host);
  await expect(
    user.operations.run.mutate({ id: 'project.list', params: {} }),
  ).resolves.toEqual(expect.any(Array));
  await expect(
    user.operations.run.mutate({
      id: 'session.rename',
      params: { ...journey.target, title: 'User title' },
    }),
  ).resolves.toEqual({});
  await expect(
    user.operations.run.mutate({
      id: 'session.archive',
      params: journey.target,
    }),
  ).resolves.toEqual({});

  const snapshot = await waitForAcpSnapshot(
    journey.host,
    journey.session.sessionId,
    () => true,
  );

  expect(snapshot.pendingPermission).toBeNull();
}, 30_000);

it('runs read, act and confirm App procedures without asking a Session', async () => {
  const { host, session, target } = await permissionJourney();
  await expect(host.caller.project.list()).resolves.toEqual(expect.any(Array));
  await expect(
    host.caller.session.rename({ ...target, title: 'App title' }),
  ).resolves.toEqual({});
  await expect(host.caller.session.archive(target)).resolves.toEqual({});

  const snapshot = await waitForAcpSnapshot(
    host,
    session.sessionId,
    () => true,
  );

  expect(snapshot.pendingPermission).toBeNull();
}, 30_000);
