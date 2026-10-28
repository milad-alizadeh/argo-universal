import { expect, it } from 'vitest';
import { holdProjectReads } from '#mocks/git-read-gate';
import {
  operationRaceHost,
  beginHeldTurn,
  pendingOperation,
} from '#mocks/operation-race';

const listProjects = { id: 'project.list', params: {} } as const;

it('finishes an idle Operation row when a new Turn starts before its result returns', async () => {
  const { host, session } = await operationRaceHost();
  const gate = await holdProjectReads(host.home);

  const outcome = Promise.allSettled([
    session.caller.operations.run.mutate(listProjects),
  ]);

  await gate.started();
  const row = await pendingOperation(host, session.sessionId);

  expect(row.turnId).toBeNull();
  await beginHeldTurn(host, session.sessionId);
  await gate.release();
  expect(await outcome).toMatchObject([{ status: 'fulfilled' }]);
  expect(
    await host.caller.feed.row({ sessionId: session.sessionId, id: row.id }),
  ).toMatchObject({ state: 'settled', status: 'completed', turnId: null });
}, 30_000);

it('keeps a real Turn Operation cancelled when its result arrives during a later Turn', async () => {
  const { host, session } = await operationRaceHost();
  await beginHeldTurn(host, session.sessionId);
  const gate = await holdProjectReads(host.home);

  const outcome = Promise.allSettled([
    session.caller.operations.run.mutate(listProjects),
  ]);

  await gate.started();
  const row = await pendingOperation(host, session.sessionId);

  expect(row.turnId).toEqual(expect.any(String));
  await host.caller.session.cancel({ sessionId: session.sessionId });

  const settled = await host.caller.feed.row({
    sessionId: session.sessionId,
    id: row.id,
  });

  expect(settled).toMatchObject({
    state: 'settled',
    status: 'cancelled',
    turnId: row.turnId,
  });
  await beginHeldTurn(host, session.sessionId);
  await gate.release();
  expect(await outcome).toMatchObject([{ status: 'fulfilled' }]);
  expect(
    await host.caller.feed.row({ sessionId: session.sessionId, id: row.id }),
  ).toEqual(settled);
}, 30_000);

it('cancels an idle Operation on Session close and ignores its late successful result', async () => {
  const { host, session } = await operationRaceHost();
  const gate = await holdProjectReads(host.home);

  const outcome = Promise.allSettled([
    session.caller.operations.run.mutate(listProjects),
  ]);

  await gate.started();
  const row = await pendingOperation(host, session.sessionId);

  await host.caller.session.close({ sessionId: session.sessionId });

  const settled = await host.caller.feed.row({
    sessionId: session.sessionId,
    id: row.id,
  });

  try {
    expect(settled).toMatchObject({
      state: 'settled',
      status: 'cancelled',
      turnId: null,
    });
  } finally {
    await gate.release();
  }

  expect(await outcome).toMatchObject([{ status: 'fulfilled' }]);
  expect(
    await host.caller.feed.row({ sessionId: session.sessionId, id: row.id }),
  ).toEqual(settled);
}, 30_000);
