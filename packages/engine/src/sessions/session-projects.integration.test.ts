import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SessionNewInput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { startSessionJourney, newSession } from '#mocks/session-journey';

it('refuses a New Session for an unknown Project, base branch or an Agent that is not installed', async (): Promise<void> => {
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
  ).rejects.toMatchObject({
    code: 'PRECONDITION_FAILED',
    message: 'Agent "unregistered" is not installed.',
    cause: {
      openError: {
        type: 'failed',
        message: 'Agent "unregistered" is not installed.',
      },
    },
  });
});

it('lists local branches with the current one, and null when HEAD is detached', async (): Promise<void> => {
  const { caller, git } = await startSessionJourney();
  expect(await caller.project.listBranches({ projectId: 'project-1' })).toEqual(
    {
      branches: ['feature', 'main'],
      currentBranch: 'main',
    },
  );
  git('switch', '-q', '--detach', 'feature');
  expect(await caller.project.listBranches({ projectId: 'project-1' })).toEqual(
    {
      branches: ['feature', 'main'],
      currentBranch: null,
    },
  );
  await expect(
    caller.project.listBranches({ projectId: 'missing' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});

it('defaults the checkout choice to a worktree from the current branch, and the main checkout when HEAD is detached', async (): Promise<void> => {
  const { caller, git } = await startSessionJourney();

  const readCheckoutChoice = async (): Promise<
    { type: 'worktree'; baseBranch: string } | { type: 'main' } | undefined
  > => (await caller.project.list())[0]?.checkoutChoice;

  expect(await readCheckoutChoice()).toEqual({
    type: 'worktree',
    baseBranch: 'main',
  });
  git('switch', '-q', '--detach', 'feature');
  expect(await readCheckoutChoice()).toEqual({ type: 'main' });
});

it('starts a named Session branch from the origin tracking tip', async (): Promise<void> => {
  const { caller, git, openings } = await startSessionJourney();
  git('branch', 'spec-x', 'main');
  git('update-ref', 'refs/remotes/origin/spec-x', 'feature');

  await caller.session.new({
    ...newSession,
    prompt: [],
    checkout: { type: 'worktree', baseBranch: 'spec-x', branch: 'ticket/2250' },
  });

  const cwd = openings[0]?.cwd ?? '';
  expect(git('-C', cwd, 'branch', '--show-current')).toBe('ticket/2250');
  expect(git('-C', cwd, 'rev-parse', 'HEAD')).toBe(
    git('rev-parse', 'origin/spec-x'),
  );
});

it.each(['reuse', 'remove'] as const)(
  'offers %s of a disposable unowned worktree and protects it once claimed',
  async (action): Promise<void> => {
    const { caller, git, openings } = await startSessionJourney();

    const path = join(
      git('rev-parse', '--show-toplevel'),
      'disposable worktree',
    );

    const branch = 'ticket/taken';
    git('worktree', 'add', '-b', branch, path, 'feature');
    const head = git('rev-parse', branch);

    const input = {
      ...newSession,
      prompt: [],
      checkout: { type: 'worktree', baseBranch: 'main', branch },
    } satisfies SessionNewInput;

    await expect(caller.session.new(input)).rejects.toThrow(
      `Branch ${branch} is checked out at ${path}. Retry`,
    );
    writeFileSync(join(path, 'untracked'), 'keep');

    const resolve = (
      choice: 'reuse' | 'remove',
    ): ReturnType<typeof caller.session.new> =>
      caller.session.new({
        ...input,
        prompt: [],
        checkout: { ...input.checkout, takenBranch: { path, action: choice } },
      });

    await expect(resolve(action)).rejects.toThrow(
      'The worktree has local files or changes',
    );
    unlinkSync(join(path, 'untracked'));

    await resolve(action);
    const cwd = openings[0]?.cwd ?? '';
    expect(cwd === path).toBe(action === 'reuse');
    expect(existsSync(path)).toBe(action === 'reuse');
    expect(git('-C', cwd, 'rev-parse', 'HEAD')).toBe(head);

    await expect(
      caller.session.new({
        ...input,
        checkout: {
          ...input.checkout,
          takenBranch: { path: cwd, action: 'remove' },
        },
      }),
    ).rejects.toThrow(`Branch ${branch} is checked out at ${cwd}.`);
    expect(existsSync(cwd)).toBe(true);
  },
);
