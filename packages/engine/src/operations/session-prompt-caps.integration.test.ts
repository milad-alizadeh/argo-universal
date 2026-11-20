import { OperationExecution } from '@repo/contracts/operations';
import { assert, expect, it } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { runOperation } from '#mocks/operations';
import {
  delegationJourney,
  holdSession,
  startDelegated,
} from '#mocks/session-delegation';

it('reserves the last running slot across concurrent child prompts and releases a denied attempt', async () => {
  const journey = await delegationJourney();
  const running = await holdFourChildren(journey);

  const first = await startDelegated(journey);
  const second = await startDelegated(journey);
  await holdSession(journey, journey.caller.sessionId);

  const prompt = async (sessionId: string): Promise<OperationExecution> => {
    const value = OperationExecution.parse(
      await runOperation(journey.caller.caller.operations, {
        id: 'session.prompt',
        params: {
          sessionId,
          prompt: [{ type: 'text', text: 'Continue delegated work' }],
        },
      }),
    );

    return value.id.startsWith('call:')
      ? journey.caller.caller.operations.wait.mutate({ id: value.id })
      : value;
  };

  const results = await Promise.allSettled([
    prompt(first.sessionId),
    prompt(second.sessionId),
  ]);

  expect(results.map((result) => result.status).sort()).toEqual([
    'fulfilled',
    'rejected',
  ]);
  expect(results.find((result) => result.status === 'rejected')).toMatchObject({
    reason: { message: 'The Session delegation limit has been reached' },
  });
  const stopped = running[0];
  assert(stopped);
  await journey.host.caller.session.cancel({ sessionId: stopped.sessionId });
  await waitForAcpSessionIdle(journey.host, stopped.sessionId);
  const retry = results[0]?.status === 'rejected' ? first : second;
  expect(await prompt(retry.sessionId)).toMatchObject({
    turn: { sessionId: retry.sessionId, status: 'running' },
  });
}, 30_000);

async function holdFourChildren(
  journey: Awaited<ReturnType<typeof delegationJourney>>,
): Promise<Awaited<ReturnType<typeof startDelegated>>[]> {
  const running = [];

  for (let index = 0; index < 4; index += 1) {
    const child = await startDelegated(journey);
    await holdSession(journey, child.sessionId);
    running.push(child);
  }

  return running;
}
