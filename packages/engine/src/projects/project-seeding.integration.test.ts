import { basename, join } from 'node:path';
import type { Database } from '@repo/db';
import { project } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { startProjectTestHost } from '#mocks/project-host';
import { seedProject } from './index';

type TestGit = Awaited<ReturnType<typeof startProjectTestHost>>['git'];

// A second Checkout of the repository, on its own branch, with no Project registered yet.
async function addLinkedCheckout(
  database: Database,
  git: TestGit,
  projectPath: string,
): Promise<string> {
  database.$client.exec('DELETE FROM session; DELETE FROM project');
  const linkedPath = join(projectPath, 'linked');
  await git('worktree', 'add', '-q', '-b', 'linked', linkedPath);

  return linkedPath;
}

it('leaves a registered Project at its main checkout when a linked Checkout of it is seeded', async (): Promise<void> => {
  const { database, caller, projectPath, git } = await startProjectTestHost();
  const linkedPath = await addLinkedCheckout(database, git, projectPath);
  await seedProject(database, projectPath);
  const originalProjects = await caller.project.list();
  expect(originalProjects).toEqual([
    expect.objectContaining({ id: expect.stringMatching(/^[a-f0-9]{64}$/) }),
  ]);
  await seedProject(database, linkedPath);
  expect(await caller.project.list()).toEqual([
    { ...originalProjects[0], path: projectPath, name: basename(projectPath) },
  ]);
});

it('registers a Project seeded through a linked Checkout at the main checkout', async (): Promise<void> => {
  const { database, caller, projectPath, git } = await startProjectTestHost();
  const linkedPath = await addLinkedCheckout(database, git, projectPath);
  await seedProject(database, linkedPath);
  expect(await caller.project.list()).toEqual([
    expect.objectContaining({
      path: projectPath,
      name: basename(projectPath),
      checkoutChoice: { type: 'worktree', baseBranch: 'main' },
    }),
  ]);
});

// A Project an older Server left on a linked Checkout keeps its identity and moves back.
it('returns a Project stored at a linked Checkout to its main checkout', async (): Promise<void> => {
  const { database, caller, projectPath, git } = await startProjectTestHost();
  const linkedPath = await addLinkedCheckout(database, git, projectPath);
  await seedProject(database, linkedPath);
  database.update(project).set({ path: linkedPath, name: 'linked' }).run();
  const [stored] = await caller.project.list();
  await seedProject(database, projectPath);
  expect(await caller.project.list()).toEqual([
    {
      ...stored,
      path: projectPath,
      name: basename(projectPath),
      checkoutChoice: { type: 'worktree', baseBranch: 'main' },
    },
  ]);
});
