import { SessionNewOutput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { holdBranchReads } from '#mocks/git-read-gate';
import { openingWaitHost } from '#mocks/operation-opening';

it('caps an unstored ACP opening, then resumes its one actual first Prompt', async () => {
  const host = await openingWaitHost();
  const { clock, opening, release, user } = host;

  const run = user.operations.run.mutate({
    id: 'session.new',
    params: {
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'After opening' }],
    },
    wait: true,
  });

  await opening;
  await clock.waitUntilScheduled();
  clock.advance(90_000);
  const pending = OperationExecution.parse(await run);
  expect(pending).toMatchObject({
    status: 'still_running',
    id: expect.stringMatching(/^creation:/),
  });
  const created = SessionNewOutput.parse(pending.result);
  expect((await host.caller.session.list({})).sessions).not.toContainEqual(
    expect.objectContaining(created),
  );
  release.resolve();
  const settled = await user.operations.wait.mutate({ id: pending.id });
  expect(settled).toMatchObject({
    status: 'settled',
    turn: { stopReason: 'end_turn' },
  });
  const page = await host.caller.feed.page({ ...created, direction: 'tail' });
  expect(
    page.rows.filter((row) => row.sessionUpdate === 'user_message'),
  ).toHaveLength(1);
  expect(clock.activeDeadlines()).toBe(0);
}, 30_000);


it('shares one ninety-second deadline across branch validation and ACP opening', async () => {
  const host = await openingWaitHost();
  const gate = await holdBranchReads(host.home);
  let answered = false;
  const running = host.user.operations.run.mutate({id: 'session.new', params: {...emptySessionInput, checkout: {type: 'worktree', baseBranch: 'main'}, prompt: [{type: 'text', text: 'One deadline'}]}, wait: true}).then(value => { answered = true; return value; });
  await gate.started();
  host.clock.advance(30_000);
  await gate.release();
  await host.opening;
  host.clock.advance(59_999);
  await Promise.resolve();
  expect(answered).toBe(false);
  host.clock.advance(1);
  const pending = OperationExecution.parse(await running);
  expect(pending.status).toBe('still_running');
  host.release.resolve();
  expect(await host.user.operations.wait.mutate({id: pending.id})).toMatchObject({status: 'settled', turn: {stopReason: 'end_turn'}});
  expect(host.clock.activeDeadlines()).toBe(0);
}, 30_000);
