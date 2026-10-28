import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { TestOperationWaitClock } from '#mocks/operation-wait-clock';
import { operationCaller } from '#mocks/operations';
import { holdBranchReads } from '#mocks/git-read-gate';

it('expires unadmitted branch validation at ninety seconds and prevents a late Session start', async () => {
  const clock = new TestOperationWaitClock();
  const host = await startAcpEngine({ operationWaitClock: clock, steps: [] });
  const user = await operationCaller(host);
  const gate = await holdBranchReads(host.home);
  const outcome = Promise.allSettled([user.operations.run.mutate({ id: 'session.new', params: { ...emptySessionInput, checkout: { type: 'worktree', baseBranch: 'main' }, prompt: [{ type: 'text', text: 'Never admitted' }] }, wait: true })]);
  await gate.started();
  clock.advance(90_000);
  try { expect(await outcome).toMatchObject([{ status: 'rejected', reason: { data: { code: 'TIMEOUT' } } }]); }
  finally { await gate.release(); }
  const control = await host.caller.session.new({ ...emptySessionInput, prompt: [{ type: 'text', text: 'Control after timeout' }] });
  expect((await host.caller.session.list({})).sessions.map((value) => value.title)).not.toContain('Never admitted');
  expect(control.sessionId).toEqual(expect.any(String));
  expect(clock.activeDeadlines()).toBe(0);
}, 30_000);
