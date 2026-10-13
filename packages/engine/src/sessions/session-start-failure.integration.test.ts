import { session } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { newSession } from '#mocks/session-journey';
import {
  failingAgent,
  signInFailure,
  startFailedSessionJourney,
} from '#mocks/session-start-failure';

it.each([{ type: 'main' }, { type: 'worktree', baseBranch: 'main' }] as const)(
  'leaves no Session and no worktree when the Agent cannot start in the $type checkout',
  async (checkout): Promise<void> => {
    const { caller, database, git } = await startFailedSessionJourney();
    expect(await caller.agents.recheck({ agentId: failingAgent })).toEqual({
      status: 'ready',
    });
    await expect(
      caller.session.new({ ...newSession, agent: failingAgent, checkout }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining(signInFailure),
    });
    expect(database.select({ id: session.id }).from(session).all()).toEqual([
      { id: 'session-1' },
    ]);
    expect(
      git('worktree', 'list', '--porcelain').match(/^worktree /gm),
    ).toHaveLength(1);
    expect(git('branch', '--list', 'argo/*')).toBe('');
    expect(
      (await caller.projects.list()).find(
        (project) => project.id === 'project-1',
      ),
    ).toMatchObject({
      checkoutChoice: { type: 'worktree', baseBranch: 'main' },
    });
  },
);

it('saves what a Ready Agent observed when its Session fails to open, so it leaves the picker', async (): Promise<void> => {
  const { caller } = await startFailedSessionJourney();
  await caller.agents.recheck({ agentId: failingAgent });
  await expect(
    caller.session.new({ ...newSession, agent: failingAgent }),
  ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  expect(
    (await caller.agents.list()).find(({ agent }) => agent === failingAgent),
  ).toMatchObject({
    status: 'cant-start',
    reason: expect.stringContaining(signInFailure),
  });
});
