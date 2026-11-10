import { expect, it } from 'vitest';
import { operationCaller } from '#mocks/operations';
import { sessionAccessHost, openAccessSession } from '#mocks/session-access';

const unauthorized = { data: { code: 'UNAUTHORIZED' } };

it('answers the user and a live Session, and refuses no token and a closed Session', async () => {
  const fixture = await sessionAccessHost();
  const live = await openAccessSession(fixture, 'Live');
  const closed = await openAccessSession(fixture, 'Closed');
  const user = await operationCaller(fixture.host);

  expect(await user.operations.instructions.query()).toEqual([]);
  expect(await live.caller.operations.instructions.query()).toEqual([]);
  const anonymous = await operationCaller(fixture.host, '');

  await expect(anonymous.operations.instructions.query()).rejects.toMatchObject(
    unauthorized,
  );

  await fixture.host.caller.session.close({ sessionId: closed.sessionId });
  await expect(
    closed.caller.operations.instructions.query(),
  ).rejects.toMatchObject(unauthorized);
}, 30_000);
