import { basename } from 'node:path';
import { expect, it } from 'vitest';
import { startProjectTestHost } from '#mocks/project-host';
import { readPluginProjects } from './index';

it('lists registered Project identity and origin metadata for Plugins', async () => {
  const { database, git, projectPath } = await startProjectTestHost();

  const originUrl = 'git@github.com:owner/repository.git';

  await git('remote', 'add', 'origin', originUrl);

  expect(await readPluginProjects(database)).toEqual([
    { id: 'project-1', name: basename(projectPath), originUrl },
  ]);
});
