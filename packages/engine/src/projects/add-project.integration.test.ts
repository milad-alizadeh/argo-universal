import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { makeResolvedTempFolderSync } from '@repo/mocks/fs/resolved-temp-folder';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { expect, it, onTestFinished, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

it('adds the Project that holds a folder, once however often it is added', async (): Promise<void> => {
  const { caller } = await startEngineTestHost();
  const projectPath = makeResolvedTempFolderSync('added-project-');
  await initTestRepository(projectPath);
  onTestFinished((): void =>
    rmSync(projectPath, { recursive: true, force: true }),
  );
  const nestedPath = join(projectPath, 'nested');
  mkdirSync(nestedPath);

  const first = await caller.project.add({ path: nestedPath });
  const second = await caller.project.add({ path: projectPath });

  expect(second).toEqual(first);

  const added = (await caller.project.list()).filter(
    ({ path }): boolean => path === projectPath,
  );

  expect(added).toMatchObject([
    { id: first.projectId, name: basename(projectPath) },
  ]);
});

it.each([
  {
    what: 'a folder that does not exist',
    path: join(tmpdir(), 'no-such-folder'),
  },
  { what: 'a folder outside any repository', path: tmpdir() },
])('refuses to add $what', async ({ path }): Promise<void> => {
  const { caller } = await startEngineTestHost();

  await expect(caller.project.add({ path })).rejects.toMatchObject({
    code: 'BAD_REQUEST',
  });
});

it('creates a new Project in the Projects folder and refuses a name taken', async (): Promise<void> => {
  const folder = makeResolvedTempFolderSync('projects-folder-');
  onTestFinished((): void => rmSync(folder, { recursive: true, force: true }));
  vi.stubEnv('ARGO_PROJECTS_DIR', folder);
  onTestFinished((): void => void vi.unstubAllEnvs());
  const { caller } = await startEngineTestHost();

  const { projectId } = await caller.project.create({ name: 'notes' });

  expect(await caller.project.list()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: projectId, name: 'notes' }),
    ]),
  );
  await expect(caller.project.create({ name: 'notes' })).rejects.toMatchObject({
    code: 'BAD_REQUEST',
  });
  await expect(
    caller.project.create({ name: '../escape' }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});

it('clones a repository into the Projects folder and refuses an option as a URL', async (): Promise<void> => {
  const folder = makeResolvedTempFolderSync('projects-folder-');
  const source = makeResolvedTempFolderSync('clone-source-');
  await initTestRepository(source);
  onTestFinished((): void => {
    rmSync(folder, { recursive: true, force: true });
    rmSync(source, { recursive: true, force: true });
  });
  vi.stubEnv('ARGO_PROJECTS_DIR', folder);
  onTestFinished((): void => void vi.unstubAllEnvs());
  const { caller } = await startEngineTestHost();

  const { projectId } = await caller.project.clone({ url: source });

  expect(await caller.project.list()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: projectId, name: basename(source) }),
    ]),
  );
  await expect(
    caller.project.clone({ url: '--upload-pack=touch /tmp/x' }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});
