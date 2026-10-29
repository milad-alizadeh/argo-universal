import { expect, it } from 'vitest';
import { runOperation } from '#mocks/operations';
import {
  delegationJourney,
  holdSession,
  startDelegated,
} from '#mocks/session-delegation';

it('records the calling Session as Operation provenance and permits cancelling its Agent', async () => {
  const journey = await delegationJourney();
  const child = await startDelegated(journey);

  expect(
    await journey.host.caller.session.get({ sessionId: child.sessionId }),
  ).toMatchObject({
    startedBySessionId: journey.caller.sessionId,
  });
  expect(await journey.host.caller.session.list({})).toMatchObject({
    sessions: expect.arrayContaining([
      expect.objectContaining({
        sessionId: child.sessionId,
        parentSessionId: null,
      }),
    ]),
  });
  await holdSession(journey, child.sessionId);
  expect(
    await runOperation(journey.caller.caller.operations, {
      id: 'session.cancel',
      params: { sessionId: child.sessionId },
    }),
  ).toEqual({});
});
