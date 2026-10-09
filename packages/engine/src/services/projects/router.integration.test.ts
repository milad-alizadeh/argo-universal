import { mkdtempSync, realpathSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import type { Database } from '@repo/db';
import { project } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { initTestRepository } from '#mocks/git';
import { startRouterTestHost } from '#mocks/router';
import { seedProject } from './index';

const internalServerError = 'INTERNAL_SERVER_ERROR';
const firstShapeRejection = 'projects: rejected shape #1';

function startProjectTestHost(): ReturnType<typeof startRouterTestHost> & {
  database: Database;
  projectPath: string;
  git: ReturnType<typeof initTestRepository>;
} {
  const projectPath = realpathSync(mkdtempSync(join(tmpdir(), 'project-')));
  const git = initTestRepository(projectPath);
  const { database, remove } = openTestDatabase({}, projectPath);
  onTestFinished((): void => {
    remove();
    rmSync(projectPath, { recursive: true, force: true });
  });
  return { ...startRouterTestHost({ database }), database, projectPath, git };
}

it('preserves a registered Project identity and stored metadata through a nested path', async (): Promise<void> => {
  const { database, caller, projectPath } = startProjectTestHost();
  database
    .update(project)
    .set({
      name: 'Previous name',
      createdAt: 123,
      checkoutChoice: { type: 'worktree', baseBranch: 'feature' },
    })
    .where(eq(project.id, 'project-1'))
    .run();
  const nestedPath = join(projectPath, 'nested');
  mkdirSync(nestedPath);
  await seedProject(database, nestedPath);
  expect(await caller.projects.list()).toEqual([
    {
      id: 'project-1',
      path: projectPath,
      name: basename(projectPath),
      createdAt: 123,
      checkoutChoice: { type: 'worktree', baseBranch: 'feature' },
    },
  ]);
});

it('registers linked Checkouts as one Project identified by the Git common directory', async (): Promise<void> => {
  const { database, caller, projectPath, git } = startProjectTestHost();
  database.$client.exec('DELETE FROM session; DELETE FROM project');
  await seedProject(database, projectPath);
  const originalProjects = await caller.projects.list();
  expect(originalProjects).toEqual([
    expect.objectContaining({ id: expect.stringMatching(/^[a-f0-9]{64}$/) }),
  ]);
  const linkedPath = join(projectPath, 'linked');
  git('worktree', 'add', '-q', '-b', 'linked', linkedPath);
  await seedProject(database, linkedPath);
  expect(await caller.projects.list()).toEqual([
    {
      ...originalProjects[0],
      path: linkedPath,
      name: 'linked',
      checkoutChoice: { type: 'worktree', baseBranch: 'linked' },
    },
  ]);
});

it('reports successive invalid stored Project choices once per request with one Engine counter', async (): Promise<void> => {
  const { database, caller } = startProjectTestHost();
  database
    .update(project)
    .set({ checkoutChoice: { type: 'unrecognised' } })
    .run();
  const errors = vi.spyOn(console, 'error').mockImplementation((): void => {});
  onTestFinished((): void => errors.mockRestore());
  await expect(caller.projects.list()).rejects.toMatchObject({
    code: internalServerError,
  });
  await expect(caller.projects.list()).rejects.toMatchObject({
    code: internalServerError,
  });
  expect(errors.mock.calls.map(([line]): string => String(line))).toEqual([
    firstShapeRejection,
    'projects: rejected shape #2',
  ]);
});

it('starts Project rejection reporting afresh for another Engine context', async (): Promise<void> => {
  const { database, caller } = startProjectTestHost();
  database
    .update(project)
    .set({ checkoutChoice: { type: 'unrecognised' } })
    .run();
  const errors = vi.spyOn(console, 'error').mockImplementation((): void => {});
  onTestFinished((): void => errors.mockRestore());
  await expect(caller.projects.list()).rejects.toMatchObject({
    code: internalServerError,
  });
  const nextEngine = startRouterTestHost({ database });
  await expect(nextEngine.caller.projects.list()).rejects.toMatchObject({
    code: internalServerError,
  });
  expect(errors.mock.calls.map(([line]): string => String(line))).toEqual([
    firstShapeRejection,
    firstShapeRejection,
  ]);
});

it('preserves the exact missing Project error through its real branches procedure', async (): Promise<void> => {
  const { caller } = startProjectTestHost();
  await expect(
    caller.projects.branches({ projectId: 'missing' }),
  ).rejects.toMatchObject({
    code: 'NOT_FOUND',
    message: 'No Project missing',
  });
});

it.each([{ projectId: 42 }, { projectId: 'project-1', extra: true }])(
  'rejects malformed Project branch requests before Git: %j',
  async (input): Promise<void> => {
    const { caller } = startProjectTestHost();
    await expect(
      Reflect.apply(caller.projects.branches, undefined, [input]),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  },
);

it.each(['branches', 'list'] as const)(
  'preserves Git failures from the real Project %s procedure',
  async (procedure): Promise<void> => {
    const { caller, projectPath } = startProjectTestHost();
    rmSync(join(projectPath, '.git'), { recursive: true });
    await expect(
      Reflect.apply(caller.projects[procedure], undefined, [
        { projectId: 'project-1' },
      ]),
    ).rejects.toMatchObject({
      code: internalServerError,
      message: expect.stringContaining('Command failed: git'),
    });
  },
);

it('preserves the registration error when stored Project JSON cannot be decoded', async (): Promise<void> => {
  const { database, projectPath } = startProjectTestHost();
  database.$client.exec("UPDATE project SET checkout_choice = 'not JSON'");
  await expect(seedProject(database, projectPath)).rejects.toThrow(
    'Unexpected token',
  );
});
