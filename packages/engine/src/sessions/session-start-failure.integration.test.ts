import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { session } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { newSession } from '#mocks/session-journey';
import {
  type FailedJourney,
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

// A Checkout that cannot be created fails the Session before the Agent is asked, so its Readiness stands.
const blockWorktrees = ({ git }: FailedJourney): void => {
  writeFileSync(join(git('rev-parse', '--absolute-git-dir'), 'worktrees'), '');
};

it.each([
  {
    failure: 'the Agent refuses the Session',
    checkout: { type: 'main' },
    prepare: (): void => {},
    saved: {
      status: 'cant-start',
      reason: expect.stringContaining(signInFailure),
    },
  },
  {
    failure: 'its Checkout cannot be created',
    checkout: { type: 'worktree', baseBranch: 'main' },
    prepare: blockWorktrees,
    saved: { status: 'ready' },
  },
] as const)(
  'saves what a Ready Agent observed only when $failure, so only an Agent failure leaves the picker',
  async ({ checkout, prepare, saved }): Promise<void> => {
    const journey = await startFailedSessionJourney();
    const { caller } = journey;
    await caller.agents.recheck({ agentId: failingAgent });
    prepare(journey);
    await expect(
      caller.session.new({ ...newSession, agent: failingAgent, checkout }),
    ).rejects.toMatchObject({ name: 'TRPCError' });
    expect(
      (await caller.agents.list()).find(({ agent }) => agent === failingAgent),
    ).toMatchObject(saved);
  },
);
