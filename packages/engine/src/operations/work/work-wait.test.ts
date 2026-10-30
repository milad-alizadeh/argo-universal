import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import {
  callRead,
  callerToken,
  callWork,
  never,
  runFromSession,
  workHost,
  type WorkHost,
} from './work-fixtures';

// A Session caller's Tool call that waits for the user, and its wait id.
async function waitingCall(host: WorkHost): Promise<string> {
  host.source.set(callWork, callRead({ status: 'waiting_for_user' }));

  const pending = OperationExecution.parse(
    await runFromSession(host, {
      id: 'project.list',
      wait: false,
      result: never,
    }),
  );

  return pending.id;
}

it('answers a running Tool call with its wait id at ninety seconds', async () => {
  const host = workHost();
  host.source.set(callWork, callRead({ status: 'still_running' }));
  let answered = false;

  const running = runFromSession(host, {
    id: 'project.list',
    wait: true,
    result: never,
  }).then((value) => {
    answered = true;

    return value;
  });

  await host.clock.waitUntilScheduled();
  host.clock.advance(89_999);
  await new Promise(setImmediate);
  expect(answered).toBe(false);
  host.clock.advance(1);
  expect(OperationExecution.parse(await running)).toMatchObject({
    status: 'still_running',
    id: expect.stringMatching(/^call:/),
  });
  expect(host.clock.activeDeadlines()).toBe(0);
  expect(host.source.watching('caller')).toBe(0);
});

// A resumed wait the test disconnects once it watches its Tool call.
async function disconnectedWait(
  host: WorkHost,
): Promise<{ waiting: Promise<unknown> }> {
  const id = await waitingCall(host);
  const abort = new AbortController();
  const waiting = host.work.wait(id, callerToken, { signal: abort.signal });

  await expect.poll(() => host.source.watching('caller')).toBeGreaterThan(0);
  abort.abort();

  return { waiting };
}

it('rejects a disconnected wait', async () => {
  const { waiting } = await disconnectedWait(workHost());

  await expect(waiting).rejects.toMatchObject({
    code: 'CLIENT_CLOSED_REQUEST',
  });
});

it('keeps no deadline or watch once a wait disconnects', async () => {
  const host = workHost();
  const { waiting } = await disconnectedWait(host);
  await waiting.catch(() => null);

  expect(host.clock.activeDeadlines()).toBe(0);
  expect(host.source.watching('caller')).toBe(0);
});

it('rejects a wait already disconnected before it reads', async () => {
  const host = workHost();
  const id = await waitingCall(host);

  await expect(
    host.work.wait(id, callerToken, { signal: AbortSignal.abort() }),
  ).rejects.toMatchObject({ code: 'CLIENT_CLOSED_REQUEST' });
  expect(host.clock.activeDeadlines()).toBe(0);
});

it('authorizes the caller again on each read, so a revoked token ends its wait', async () => {
  const host = workHost();
  const id = await waitingCall(host);
  const waiting = host.work.wait(id, callerToken);

  await expect.poll(() => host.source.watching('caller')).toBeGreaterThan(0);
  host.revoke();
  host.source.set(callWork, callRead({ status: 'waiting_for_user' }));
  await expect(waiting).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  expect(host.clock.activeDeadlines()).toBe(0);
});

it('settles a resumed wait when its Tool call settles', async () => {
  const host = workHost();
  const id = await waitingCall(host);
  const waiting = host.work.wait(id, callerToken);

  await expect.poll(() => host.source.watching('caller')).toBeGreaterThan(0);
  host.source.set(
    callWork,
    callRead({ status: 'completed', result: { ok: 1 } }),
  );
  expect(await waiting).toEqual({
    kind: 'operation_execution',
    id,
    status: 'settled',
    result: { ok: 1 },
  });
});
