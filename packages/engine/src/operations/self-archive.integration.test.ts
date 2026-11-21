import { expect, it } from 'vitest';
import { closeTestSession } from '#mocks/close-session';
import { permissionJourney } from '#mocks/native-permission';
import { beginHeldTurn, operationRaceHost } from '#mocks/operation-race';
import { runOperation } from '#mocks/operations';

const archiveOperation = 'session.archive';

it('accepts a self archive without permission, lets the current Turn finish, then archives', async () => {
  const { host, session, release } = await permissionJourney();
  await beginHeldTurn(host, session.sessionId);
  expect(
    await runOperation(session.caller.operations, {
      id: archiveOperation,
      params: { sessionId: session.sessionId },
      wait: true,
    }),
  ).toEqual({ scheduled: true });
  expect(
    (await host.caller.session.list({ archived: false })).sessions,
  ).toContainEqual(expect.objectContaining({ sessionId: session.sessionId }));
  release.resolve();
  await expect
    .poll(
      async () => (await host.caller.session.list({ archived: true })).sessions,
      { timeout: 10_000 },
    )
    .toContainEqual(expect.objectContaining({ sessionId: session.sessionId }));
}, 30_000);

it('archives its own idle Session without needing a live Turn to ask permission', async () => {
  const { host, session } = await operationRaceHost();
  expect(
    await runOperation(session.caller.operations, {
      id: archiveOperation,
      params: { sessionId: session.sessionId },
      wait: true,
    }),
  ).toEqual({ scheduled: true });
  await expect
    .poll(
      async () => (await host.caller.session.list({ archived: true })).sessions,
      { timeout: 10_000 },
    )
    .toContainEqual(expect.objectContaining({ sessionId: session.sessionId }));
}, 30_000);

it('cancels a pending self archive when the Session closes before its Turn finishes', async () => {
  const { host, session } = await operationRaceHost();
  await beginHeldTurn(host, session.sessionId);
  expect(
    await runOperation(session.caller.operations, {
      id: archiveOperation,
      params: { sessionId: session.sessionId },
      wait: true,
    }),
  ).toEqual({ scheduled: true });
  await closeTestSession(host, { sessionId: session.sessionId });
  expect((await host.caller.session.list({ archived: true })).sessions).toEqual(
    [],
  );
  expect(
    (await host.caller.session.list({ archived: false })).sessions,
  ).toContainEqual(expect.objectContaining({ sessionId: session.sessionId }));
}, 30_000);

it('keeps a deferred archive failure visible after closing its Agent', async () => {
  const { host, session } = await operationRaceHost();
  host.database.$client.exec('ALTER TABLE project RENAME TO archive_fault');

  try {
    expect(
      await runOperation(session.caller.operations, {
        id: archiveOperation,
        params: { sessionId: session.sessionId },
        wait: true,
      }),
    ).toEqual({ scheduled: true });
    await expect
      .poll(
        async () =>
          (
            await host.caller.feed.page({
              sessionId: session.sessionId,
              direction: 'tail',
            })
          ).rows,
      )
      .toContainEqual(
        expect.objectContaining({
          sessionUpdate: 'notice',
          title: 'Session could not be archived',
        }),
      );
    await expect(
      closeTestSession(host, { sessionId: session.sessionId }),
    ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
    expect(
      (
        await host.caller.feed.page({
          sessionId: session.sessionId,
          direction: 'tail',
        })
      ).rows,
    ).toContainEqual(
      expect.objectContaining({
        sessionUpdate: 'notice',
        title: 'Session could not be archived',
      }),
    );
  } finally {
    host.database.$client.exec('ALTER TABLE archive_fault RENAME TO project');
  }
}, 30_000);
