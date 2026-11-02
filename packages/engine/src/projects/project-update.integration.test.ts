import { expect, it } from 'vitest';
import { startProjectTestHost } from '#mocks/project-host';

const projectId = 'project-1';

it('answers and lists the checkout choice a Project was given', async (): Promise<void> => {
  const { caller } = await startProjectTestHost();

  const checkoutChoice = {
    type: 'worktree' as const,
    baseBranch: 'feature',
  };

  expect(await caller.project.update({ projectId, checkoutChoice })).toEqual(
    expect.objectContaining({ id: projectId, checkoutChoice }),
  );
  expect(await caller.project.list()).toEqual([
    expect.objectContaining({ checkoutChoice }),
  ]);
});

it('starts in the main Checkout once a Project is told to', async (): Promise<void> => {
  const { caller } = await startProjectTestHost();
  const checkoutChoice = { type: 'main' as const };

  await caller.project.update({ projectId, checkoutChoice });

  expect(await caller.project.list()).toEqual([
    expect.objectContaining({ checkoutChoice }),
  ]);
});

it('deletes the worktree on archive until a Project is told otherwise, leaving the checkout choice alone', async (): Promise<void> => {
  const { caller } = await startProjectTestHost();
  const [before] = await caller.project.list();

  expect(before?.deleteWorktreeOnArchive).toBe(true);
  await caller.project.update({ projectId, deleteWorktreeOnArchive: false });

  expect(await caller.project.list()).toEqual([
    expect.objectContaining({
      deleteWorktreeOnArchive: false,
      checkoutChoice: before?.checkoutChoice,
    }),
  ]);
});

it('refuses a base branch the Project does not have, and keeps its choice', async (): Promise<void> => {
  const { caller } = await startProjectTestHost();
  const [before] = await caller.project.list();

  await expect(
    caller.project.update({
      projectId,
      checkoutChoice: { type: 'worktree', baseBranch: 'nowhere' },
    }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  expect(await caller.project.list()).toEqual([before]);
});

it('refuses a Project the Server does not have', async (): Promise<void> => {
  const { caller } = await startProjectTestHost();

  await expect(
    caller.project.update({
      projectId: 'missing',
      deleteWorktreeOnArchive: false,
    }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
