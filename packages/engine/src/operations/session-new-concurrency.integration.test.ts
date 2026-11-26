import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { runOperation } from '#mocks/operations';
import {
  delegationJourney,
  holdSession,
  startDelegated,
} from '#mocks/session-delegation';

it('reserves the last running slot across concurrent Session starts before Agent launch completes', async () => {
  const journey = await delegationJourney();

  for (let index = 0; index < 9; index += 1) {
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

  const run = async (): Promise<OperationExecution> => {
    const value = OperationExecution.parse(
      await runOperation(journey.caller.caller.operations, operation),
    );

    return value.id.startsWith('call:')
      ? journey.caller.caller.operations.wait.mutate({ id: value.id })
      : value;
  };

  const settled = await Promise.allSettled([run(), run()]);

  expect(
    settled.filter((outcome) => outcome.status === 'fulfilled'),
  ).toHaveLength(1);
  expect(settled).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: 'rejected',
        reason: expect.objectContaining({
          message: expect.stringMatching(
            /^The Session delegation limit has been reached: /,
          ),
        }),
      }),
    ]),
  );
}, 30_000);
