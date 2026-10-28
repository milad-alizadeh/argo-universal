import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  delegationJourney,
  holdSession,
  startDelegated,
} from '#mocks/session-delegation';

it('reserves the last running slot across concurrent Session starts before Agent launch completes', async () => {
  const journey = await delegationJourney();

  for (let index = 0; index < 4; index += 1) {
    const child = await startDelegated(journey);
    await holdSession(journey, child.sessionId);
  }

  await holdSession(journey, journey.caller.sessionId);
  journey.firstTurnSteps.push({ type: 'wait-for-cancel' });

  const operation = {
    id: 'session.new' as const,
    params: {
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'Concurrent investigation' }],
    },
  };

  const outcomes = Promise.allSettled([
    journey.caller.caller.operations.run.mutate(operation),
    journey.caller.caller.operations.run.mutate(operation),
  ]);

  const pending = waitForAcpSnapshot(
    journey.host,
    journey.caller.sessionId,
    (snapshot) => snapshot.pendingPermission?.operation?.id === 'session.new',
  );

  expect(await Promise.race([pending.then(() => 'permission'), outcomes])).toBe(
    'permission',
  );
  const { pendingPermission } = await pending;

  if (!pendingPermission) throw new Error('Missing cap Permission request');
  await journey.host.caller.session.answerPermission({
    sessionId: journey.caller.sessionId,
    requestId: pendingPermission.requestId,
    optionId: 'reject_once',
  });
  const settled = await outcomes;

  expect(
    settled.filter((outcome) => outcome.status === 'fulfilled'),
  ).toHaveLength(1);
  expect(settled).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: 'rejected',
        reason: expect.objectContaining({ message: 'The user refused' }),
      }),
    ]),
  );
});
