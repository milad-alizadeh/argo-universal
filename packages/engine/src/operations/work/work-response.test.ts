import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import type { OperationRunResult } from '../implementations';
import {
  callRead,
  callWork,
  never,
  runFromSession,
  turnRead,
  turnWork,
  workHost,
} from './work-fixtures';

const listing: OperationRunResult = [];

const listProjects = 'project.list';

it('answers with the Operation result when it returns before its Tool call settles', async () => {
  const host = workHost();
  host.source.set(callWork, callRead({ status: 'still_running' }));

  const result = await runFromSession(host, {
    id: listProjects,
    wait: true,
    result: Promise.resolve(listing),
  });

  expect(result).toEqual(listing);
  expect(host.clock.activeDeadlines()).toBe(0);
  expect(host.source.watching('caller')).toBe(0);
});

it('answers with the Operation result, not the Tool call, when the call settles first', async () => {
  const host = workHost();
  host.source.set(callWork, callRead({ status: 'settled', result: listing }));
  const result = Promise.withResolvers<OperationRunResult>();
  let answered = false;

  const running = runFromSession(host, {
    id: listProjects,
    wait: true,
    result: result.promise,
  }).then((value) => {
    answered = true;

    return value;
  });

  await new Promise(setImmediate);
  expect(answered).toBe(false);
  result.resolve(listing);
  expect(await running).toEqual(listing);
});

it('answers with a cancelled Tool call at once, while its result never returns', async () => {
  const host = workHost();
  host.source.set(callWork, callRead({ status: 'settled', cancelled: true }));

  const result = OperationExecution.parse(
    await runFromSession(host, {
      id: listProjects,
      wait: true,
      result: never,
    }),
  );

  expect(result).toMatchObject({ status: 'settled', cancelled: true });
  expect(result.id).toMatch(/^call:/);
});

it('follows a Tool call to the Turn it started, in the Session that runs it', async () => {
  const host = workHost();
  const turn = turnWork('child', 'turn-1');
  const work = { kind: 'turn', sessionId: 'child', turnId: 'turn-1' } as const;
  host.source.set(turn, turnRead(turn, 'running'));
  host.source.set(callWork, callRead({ status: 'still_running', work }));

  const running = runFromSession(host, {
    id: 'session.prompt',
    wait: true,
    result: Promise.resolve({ messageId: 'message-1' }),
  });

  await expect.poll(() => host.source.watching('child')).toBe(1);
  host.source.set(turn, turnRead(turn, 'ended'));
  const settled = OperationExecution.parse(await running);
  expect(settled).toMatchObject({
    status: 'settled',
    turn: { id: 'turn-1', sessionId: 'child', stopReason: 'end_turn' },
  });
  expect(settled.id).toMatch(/^turn:/);
  expect(host.source.watching('child')).toBe(0);
});

it('returns at the started Turn without wait, and its wait id resumes that Turn', async () => {
  const host = workHost();
  const turn = turnWork('child', 'turn-1');
  const work = { kind: 'turn', sessionId: 'child', turnId: 'turn-1' } as const;
  host.source.set(turn, turnRead(turn, 'running'));
  host.source.set(callWork, callRead({ status: 'still_running', work }));

  const pending = OperationExecution.parse(
    await runFromSession(host, {
      id: 'session.prompt',
      wait: false,
      result: Promise.resolve({ messageId: 'message-1' }),
    }),
  );

  expect(pending).toMatchObject({ status: 'still_running' });
  const resumed = host.work.wait(pending.id, 'caller-token');
  await expect.poll(() => host.source.watching('child')).toBe(1);
  host.source.set(turn, turnRead(turn, 'ended'));
  expect(await resumed).toMatchObject({ id: pending.id, status: 'settled' });
});
