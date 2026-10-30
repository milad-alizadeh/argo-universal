import { rmSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { project } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { rejectedProcedureCode } from '#mocks/procedure-request';
import { startProjectTestHost } from '#mocks/project-host';
import { seedProject } from './index';

const internalServerError = 'INTERNAL_SERVER_ERROR';

const firstRejectionReport = 'projects: rejected shape #1';

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
  expect(await caller.project.list()).toEqual([
    {
      id: 'project-1',
      path: projectPath,
      name: basename(projectPath),
      createdAt: 123,
      checkoutChoice: { type: 'worktree', baseBranch: 'feature' },
      remoteHost: null,
      folderExists: true,
    },
  ]);
});

it.each([
  {
    newEngine: false,
    expected: [firstRejectionReport, 'projects: rejected shape #2'],
  },
  { newEngine: true, expected: [firstRejectionReport, firstRejectionReport] },
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
    await expect(caller.project.list()).rejects.toMatchObject({
      code: internalServerError,
    });

    const nextCaller = newEngine
      ? (await startEngineTestHost({ database })).caller
      : caller;

    await expect(nextCaller.project.list()).rejects.toMatchObject({
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
    caller.project.listBranches({ projectId: 'missing' }),
  ).rejects.toMatchObject({
    code: 'NOT_FOUND',
    message: 'No Project missing',
  });
});

it.each([{ projectId: 42 }, { projectId: 'project-1', extra: true }])(
  'rejects malformed Project branch requests before Git: %j',
  async (input): Promise<void> => {
    const { url } = await startProjectTestHost();
    expect(
      await rejectedProcedureCode(url, {
        path: 'project.listBranches',
        type: 'query',
        input: JSON.stringify(input),
      }),
    ).toBe('BAD_REQUEST');
  },
);

type ProjectCaller = Awaited<ReturnType<typeof startProjectTestHost>>['caller'];

it.each([
  {
    procedure: 'branches',
    call: async (caller: ProjectCaller): Promise<void> => {
      await caller.project.listBranches({ projectId: 'project-1' });
    },
  },
  {
    procedure: 'list',
    call: async (caller: ProjectCaller): Promise<void> => {
      await caller.project.list();
    },
  },
])(
  'preserves Git failures from the real Project $procedure procedure',
  async ({ call }): Promise<void> => {
    const { caller, projectPath } = await startProjectTestHost();
    rmSync(join(projectPath, '.git'), { recursive: true });
    await expect(call(caller)).rejects.toMatchObject({
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
