import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { delegatedTurnWaitHost } from '#mocks/delegated-turn-wait';

it('keeps a Session caller waiting for its new Agent’s actual Turn instead of returning its admission result', async () => {
  const { caller, clock, prompted, release } = await delegatedTurnWaitHost();

  let answered = false;

  const running = caller.caller.operations.run
    .mutate({
      id: 'session.new',
      params: {
        ...emptySessionInput,
        prompt: [{ type: 'text', text: 'Keep delegated work running' }],
      },
      wait: true,
    })
    .then((value) => {
      answered = true;

      return value;
    });

  await prompted;
  clock.advance(89_999);
  await Promise.resolve();
  expect(answered).toBe(false);
  clock.advance(1);
  const pending = OperationExecution.parse(await running);
  expect(pending.status).toBe('still_running');
  release.resolve();
  expect(
    await caller.caller.operations.wait.mutate({ id: pending.id }),
  ).toMatchObject({ status: 'settled', turn: { stopReason: 'end_turn' } });
}, 30_000);

it('reauthorizes an active native Turn wait when its calling Session closes, while the admitted Agent keeps running', async () => {
  const { host, caller, clock, prompted, release } =
    await delegatedTurnWaitHost();

  const outcome = Promise.allSettled([
    caller.caller.operations.run.mutate({
      id: 'session.new',
      params: {
        ...emptySessionInput,
        prompt: [{ type: 'text', text: 'Survive the caller' }],
      },
      wait: true,
    }),
  ]);

  await prompted;

  const child = (await host.caller.session.list({})).sessions.find(
    (value) => value.title === 'Survive the caller',
  );

  expect(child).toMatchObject({ startedBySessionId: caller.sessionId });

  if (!child) throw new Error('No admitted Agent');
  await host.caller.session.close({ sessionId: caller.sessionId });
  await expect.poll(() => clock.activeDeadlines()).toBe(0);
  expect(await outcome).toMatchObject([
    { status: 'rejected', reason: { data: { code: 'UNAUTHORIZED' } } },
  ]);
  expect(
    await host.caller.session.get({ sessionId: child.sessionId }),
  ).toMatchObject({ state: 'running' });
  release.resolve();
  await waitForAcpSessionIdle(host, child.sessionId);
  expect(
    await host.caller.session.get({ sessionId: child.sessionId }),
  ).toMatchObject({ state: 'idle' });
}, 30_000);
