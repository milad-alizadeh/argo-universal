import { expect, it } from 'vitest';
import { permissionJourney } from '#mocks/native-permission';
import { beginHeldTurn } from '#mocks/operation-race';
import { operationCaller, runOperation } from '#mocks/operations';

const archiveId = 'session.archive';

it('advertises Session confirmations only during a live Turn while a shared CLI token cannot confirm', async () => {
  const { host, session } = await permissionJourney();
  const idle = await session.caller.operations.list.query();
  expect(idle).toContainEqual(
    expect.objectContaining({
      id: 'agent.setAccess',
      enabled: false,
      disabledReason: expect.stringContaining('active Turn'),
    }),
  );
  expect(idle).not.toContainEqual(
    expect.objectContaining({ id: 'session.close' }),
  );
  expect(idle).toContainEqual(
    expect.objectContaining({
      id: archiveId,
      policy: 'archive',
      canRequestApproval: false,
    }),
  );
  const user = await operationCaller(host);
  expect(await user.operations.list.query()).toContainEqual(
    expect.objectContaining({
      id: 'session.clear',
      policy: 'ask',
      enabled: false,
    }),
  );
  await beginHeldTurn(host, session.sessionId);
  const active = await session.caller.operations.list.query();
  expect(active).toContainEqual(
    expect.objectContaining({
      id: 'agent.setAccess',
      enabled: true,
      disabledReason: null,
    }),
  );
  expect(active).toContainEqual(
    expect.objectContaining({
      id: archiveId,
      enabled: true,
      disabledReason: null,
    }),
  );
}, 30_000);

it('refuses pairing and Permission answers authenticated only by a control token', async () => {
  const { host, session } = await permissionJourney();
  const user = await operationCaller(host);

  const refusal = {
    data: { code: 'FORBIDDEN' },
    message: expect.stringContaining('authenticated App'),
  };

  await expect(user.pairing.mint.mutate()).rejects.toMatchObject(refusal);
  await expect(
    user.session.answerPermission.mutate({
      sessionId: session.sessionId,
      requestId: 'request',
      optionId: 'allow_once',
    }),
  ).rejects.toMatchObject(refusal);
  await expect(
    user.session.clear.mutate({ sessionId: session.sessionId }),
  ).rejects.toMatchObject(refusal);
}, 30_000);

it('archives an idle Session and undoes a safe archive from a Session token', async () => {
  const { host, session, target } = await permissionJourney();
  const operations = session.caller.operations;

  await expect(
    runOperation(operations, { id: archiveId, params: target }),
  ).resolves.toEqual({});
  await expect(
    runOperation(operations, { id: 'session.unarchive', params: target }),
  ).resolves.toEqual({});
  expect((await host.caller.session.get(target)).archivedAt).toBeNull();
}, 30_000);
