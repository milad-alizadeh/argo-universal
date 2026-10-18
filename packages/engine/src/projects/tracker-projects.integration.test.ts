import { basename } from 'node:path';
import { expect, it } from 'vitest';
import { startProjectTestHost } from '#mocks/project-host';
import { readTrackerProjects } from './index';

it('resolves a registered Project origin to its GitHub owner and repository for Plugins', async () => {
  const { database, git, projectPath } = await startProjectTestHost();

  const remotes = [
    ['git@github.com:owner/repository.git', 'owner/repository'],
    ['https://GITHUB.com/team/project.git/', 'team/project'],
    ['https://gitlab.com/team/project.git', null],
    ['https://github.com/--help/project.git', null],
  ] as const;

  await git('remote', 'add', 'origin', remotes[0][0]);

  for (const [remote, repository] of remotes) {
    await git('remote', 'set-url', 'origin', remote);
    expect(await readTrackerProjects(database)).toEqual([
      { id: 'project-1', name: basename(projectPath), repository },
    ]);
  }
});
