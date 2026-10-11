import { mkdtempSync, realpathSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { project } from '@repo/db/schema';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { seedProject } from './index';

const internalServerError = 'INTERNAL_SERVER_ERROR';
const firstShapeRejection = 'projects: rejected shape #1';

async function startProjectTestHost(): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>> & {
    projectPath: string;
    git: Awaited<ReturnType<typeof initTestRepository>>;
  }
> {
  const projectPath = realpathSync(mkdtempSync(join(tmpdir(), 'project-')));
  const git = await initTestRepository(projectPath);
  const { database, remove } = openTestDatabase({}, projectPath);
  onTestFinished((): void => {
    vi.unstubAllEnvs();
    remove();
    rmSync(projectPath, { recursive: true, force: true });
  });
  vi.stubEnv('ARGO_PROJECT_PATH', projectPath);
  return {
    ...(await startEngineTestHost({ database })),
    projectPath,
    git,
  };
}

it('preserves a registered Project identity and stored metadata through a nested path', async (): Promise<void> => {
  const { database, caller, projectPath } = await startProjectTestHost();
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
  const { database, caller, projectPath, git } = await startProjectTestHost();
  database.$client.exec('DELETE FROM session; DELETE FROM project');
  await seedProject(database, projectPath);
  const originalProjects = await caller.projects.list();
  expect(originalProjects).toEqual([
    expect.objectContaining({ id: expect.stringMatching(/^[a-f0-9]{64}$/) }),
  ]);
  const linkedPath = join(projectPath, 'linked');
  await git('worktree', 'add', '-q', '-b', 'linked', linkedPath);
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

it.each([
  {
    newEngine: false,
    expected: [firstShapeRejection, 'projects: rejected shape #2'],
  },
  { newEngine: true, expected: [firstShapeRejection, firstShapeRejection] },
])(
  'counts each invalid Project request within its Engine: new Engine $newEngine',
  async ({ newEngine, expected }): Promise<void> => {
    const { database, caller } = await startProjectTestHost();
    database
      .update(project)
      .set({ checkoutChoice: { type: 'unrecognised' } })
      .run();
    const errors = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {});
    onTestFinished((): void => errors.mockRestore());
    await expect(caller.projects.list()).rejects.toMatchObject({
      code: internalServerError,
    });
    const nextCaller = newEngine
      ? (await startEngineTestHost({ database })).caller
      : caller;
    await expect(nextCaller.projects.list()).rejects.toMatchObject({
      code: internalServerError,
    });
    expect(errors.mock.calls.map(([line]): string => String(line))).toEqual(
      expected,
    );
  },
);

it('preserves the exact missing Project error through its real branches procedure', async (): Promise<void> => {
  const { caller } = await startProjectTestHost();
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
    const { caller } = await startProjectTestHost();
    await expect(
      Reflect.apply(caller.projects.branches, undefined, [input]),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  },
);

it.each(['branches', 'list'] as const)(
  'preserves Git failures from the real Project %s procedure',
  async (procedure): Promise<void> => {
    const { caller, projectPath } = await startProjectTestHost();
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
  const { database, projectPath } = await startProjectTestHost();
  database.$client.exec("UPDATE project SET checkout_choice = 'not JSON'");
  await expect(seedProject(database, projectPath)).rejects.toThrow(
    'Unexpected token',
  );
});
