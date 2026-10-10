import { expect, it } from 'vitest';
import { startSessionJourney, newSession } from '#mocks/session-journey';

it('refuses a New Session for an unknown Project, base branch or Agent', async (): Promise<void> => {
  const { caller } = await startSessionJourney();
  await expect(
    caller.session.new({ ...newSession, projectId: 'missing' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await expect(
    caller.session.new({
      ...newSession,
      checkout: { type: 'worktree', baseBranch: 'missing' },
    }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  await expect(
    caller.session.new({ ...newSession, agent: 'unregistered' }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
});

it('lists local branches with the current one, and null when HEAD is detached', async (): Promise<void> => {
  const { caller, git } = await startSessionJourney();
  expect(await caller.projects.branches({ projectId: 'project-1' })).toEqual({
    branches: ['feature', 'main'],
    currentBranch: 'main',
  });
  git('switch', '-q', '--detach', 'feature');
  expect(await caller.projects.branches({ projectId: 'project-1' })).toEqual({
    branches: ['feature', 'main'],
    currentBranch: null,
  });
  await expect(
    caller.projects.branches({ projectId: 'missing' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});

it('defaults the checkout choice to a worktree from the current branch, and the main checkout when HEAD is detached', async (): Promise<void> => {
  const { caller, git } = await startSessionJourney();
  const readCheckoutChoice = async (): Promise<
    { type: 'worktree'; baseBranch: string } | { type: 'main' } | undefined
  > => (await caller.projects.list())[0]?.checkoutChoice;
  expect(await readCheckoutChoice()).toEqual({
    type: 'worktree',
    baseBranch: 'main',
  });
  git('switch', '-q', '--detach', 'feature');
  expect(await readCheckoutChoice()).toEqual({ type: 'main' });
});
