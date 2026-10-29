import { expect, it } from 'vitest';
import { permissionJourney } from '#mocks/native-permission';
import { beginHeldTurn } from '#mocks/operation-race';
import { operationCaller } from '#mocks/operations';

it('advertises Session confirmations only during a live Turn while user discovery remains unrestricted', async () => {
  const { host, session } = await permissionJourney();
  const idle = await session.caller.operations.list.query();
  expect(idle).toContainEqual(
    expect.objectContaining({
      id: 'agent.setAccess',
      enabled: false,
      disabledReason: expect.stringContaining('active Turn'),
    }),
  );
  expect(idle).toContainEqual(
    expect.objectContaining({
      id: 'session.close',
      enabled: true,
      disabledReason: null,
    }),
  );
  const user = await operationCaller(host);
  expect(
    (await user.operations.list.query()).every(
      (row) => row.enabled && row.disabledReason === null,
    ),
  ).toBe(true);
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
      id: 'session.archive',
      enabled: true,
      disabledReason: null,
    }),
  );
}, 30_000);
