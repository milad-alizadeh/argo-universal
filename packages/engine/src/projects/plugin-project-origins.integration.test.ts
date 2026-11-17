import * as git from '@repo/git';
import { expect, it, vi } from 'vitest';
import { startProjectTestHost } from '#mocks/project-host';
import { notifyProjectChanges } from './changes';
import { readPluginProjectIds, readPluginProjects } from './index';

vi.mock('@repo/git', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@repo/git')>();

  return { ...actual, readOriginUrl: vi.fn(actual.readOriginUrl) };
});

const reads = (): number => vi.mocked(git.readOriginUrl).mock.calls.length;

it('reads Project ids without reading any origin', async () => {
  const { database } = await startProjectTestHost();
  const before = reads();

  expect(readPluginProjectIds(database)).toEqual(['project-1']);
  expect(reads()).toBe(before);
});

it('reads one origin per Project for ten concurrent reads', async () => {
  const { database } = await startProjectTestHost();
  const before = reads();

  await Promise.all(
    Array.from({ length: 10 }, () => readPluginProjects(database)),
  );
  await readPluginProjects(database);

  expect(reads() - before).toBe(1);
});

it('shows a changed remote once Project changes are announced', async () => {
  const { database, git: run } = await startProjectTestHost();
  const first = 'git@github.com:owner/one.git';
  const second = 'git@github.com:owner/two.git';

  await run('remote', 'add', 'origin', first);
  expect((await readPluginProjects(database))[0]?.originUrl).toBe(first);

  await run('remote', 'set-url', 'origin', second);
  notifyProjectChanges(database);

  expect((await readPluginProjects(database))[0]?.originUrl).toBe(second);
});
