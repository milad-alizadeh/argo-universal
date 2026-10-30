import { basename, join } from 'node:path';
import { expect, it } from 'vitest';
import { startProjectTestHost } from '#mocks/project-host';
import { seedProject } from './index';

it('leaves a registered Project at its main checkout when a linked Checkout of it is seeded', async (): Promise<void> => {
  const { database, caller, projectPath, git } = await startProjectTestHost();
  database.$client.exec('DELETE FROM session; DELETE FROM project');
  await seedProject(database, projectPath);
  const originalProjects = await caller.project.list();
  expect(originalProjects).toEqual([
    expect.objectContaining({ id: expect.stringMatching(/^[a-f0-9]{64}$/) }),
  ]);
  const linkedPath = join(projectPath, 'linked');
  await git('worktree', 'add', '-q', '-b', 'linked', linkedPath);
  await seedProject(database, linkedPath);
  expect(await caller.project.list()).toEqual([
    { ...originalProjects[0], path: projectPath, name: basename(projectPath) },
  ]);
});

it('registers a Project seeded through a linked Checkout at the main checkout', async (): Promise<void> => {
  const { database, caller, projectPath, git } = await startProjectTestHost();
  database.$client.exec('DELETE FROM session; DELETE FROM project');
  const linkedPath = join(projectPath, 'linked');
  await git('worktree', 'add', '-q', '-b', 'linked', linkedPath);
  await seedProject(database, linkedPath);
  expect(await caller.project.list()).toEqual([
    expect.objectContaining({
      path: projectPath,
      name: basename(projectPath),
      checkoutChoice: { type: 'worktree', baseBranch: 'main' },
    }),
  ]);
});
