import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { answer, type OperationResult } from '../implementations';
import type { StartedWork } from '../native-start';
import {
  never,
  runAsUser,
  turnRead,
  turnWork,
  workHost,
  type WorkHost,
} from './work-fixtures';

type Begun = { signal?: AbortSignal };

// A user's native start that begins as `started` and is never accepted.
function startUnaccepted(
  host: WorkHost,
  started: Promise<StartedWork<OperationResult>>,
  begun: Begun,
): ReturnType<typeof runAsUser> {
  return runAsUser(host, {
    wait: true,
    start: (admission) =>
      admission.admit(async (signal) => {
        begun.signal = signal;

        return started;
      }),
  });
}

const newSession = {
  kind: 'creation',
  sessionId: 'new',
  turnId: 'first',
} as const;

const turn = (turnId: string): StartedWork<OperationResult> => ({
  kind: 'turn',
  sessionId: 'session-1',
  turnId,
  accepted: () => never,
});

it('answers a user Operation with its result within the deadline', async () => {
  const host = workHost();

  expect(
    await runAsUser(host, { wait: true, start: async () => answer([]) }),
  ).toEqual({ kind: 'result', result: [] });
  expect(host.clock.activeDeadlines()).toBe(0);
});

it('times out an admission at ninety seconds and aborts its signal', async () => {
  const host = workHost();
  const begun: Begun = {};
  const running = startUnaccepted(host, never, begun);

  await host.clock.waitUntilScheduled();
  host.clock.advance(90_000);
  await expect(running).rejects.toMatchObject({ code: 'TIMEOUT' });
  expect(begun.signal?.aborted).toBe(true);
});

it('answers a Turn still being admitted at ninety seconds with its wait id', async () => {
  const host = workHost();
  const work = turnWork('session-1', 'turn-1');
  host.source.set(work, turnRead(work, 'running'));
  const running = startUnaccepted(host, Promise.resolve(turn('turn-1')), {});

  await host.clock.waitUntilScheduled();
  await new Promise(setImmediate);
  host.clock.advance(90_000);
  const pending = OperationExecution.parse(await running);
  expect(pending).toMatchObject({
    status: 'still_running',
    turn: { id: 'turn-1' },
  });
  host.source.set(work, turnRead(work, 'ended'));
  expect(await host.work.wait(pending.id, 'user-token')).toMatchObject({
    status: 'settled',
  });
});

it('times out a Turn whose admission never stored it', async () => {
  const host = workHost();
  const running = startUnaccepted(host, Promise.resolve(turn('lost')), {});

  await host.clock.waitUntilScheduled();
  await new Promise(setImmediate);
  host.clock.advance(90_000);
  await expect(running).rejects.toMatchObject({ code: 'TIMEOUT' });
});

it('shares one deadline across admission and the wait that follows it', async () => {
  const host = workHost();
  host.source.set(newSession, {
    kind: 'creation',
    creation: { status: 'opening' },
  });
  const begun = Promise.withResolvers<StartedWork<OperationResult>>();
  let answered = false;

  const running = startUnaccepted(host, begun.promise, {}).then((value) => {
    answered = true;

    return value;
  });

  await host.clock.waitUntilScheduled();
  host.clock.advance(30_000);
  begun.resolve({
    kind: 'creation',
    sessionId: 'new',
    turnId: 'first',
    accepted: () => never,
  });
  await expect.poll(() => host.source.watching('new')).toBe(1);
  host.clock.advance(59_999);
  await new Promise(setImmediate);
  expect(answered).toBe(false);
  host.clock.advance(1);
  expect(OperationExecution.parse(await running)).toMatchObject({
    status: 'still_running',
    result: { sessionId: 'new' },
  });
  expect(host.source.watching('new')).toBe(0);
});
