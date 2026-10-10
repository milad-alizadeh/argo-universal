import { expect, it } from 'vitest';
import { newSession } from '#mocks/session-journey';
import {
  signInFailure,
  startFailedSessionJourney,
} from '#mocks/session-start-failure';

it.each([{ type: 'main' }, { type: 'worktree', baseBranch: 'main' }] as const)(
  'leaves no Session and no worktree when the Agent cannot start in the $type checkout',
  async (checkout): Promise<void> => {
    const { caller, git } = await startFailedSessionJourney();
    const readAgentAvailability = async (): Promise<
      | 'available'
      | 'not_installed'
      | 'not_signed_in'
      | 'unavailable'
      | undefined
    > =>
      (await caller.agents.list()).find(
        ({ agent }): boolean => agent === 'unavailable',
      )?.availability;
    expect(await readAgentAvailability()).toBe('available');
    await expect(
      caller.session.new({ ...newSession, agent: 'unavailable', checkout }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining(signInFailure),
    });
    expect(
      (await caller.session.list({ archived: false })).sessions.map(
        (row): string => row.sessionId,
      ),
    ).toEqual(['session-1']);
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
