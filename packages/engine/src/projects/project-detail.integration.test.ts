import { project } from '@repo/db/schema';
import { expect, it, onTestFinished, vi } from 'vitest';
import { startProjectTestHost } from '#mocks/project-host';

const missingFolder = '/missing/old-api';

it.each([
  { origin: 'https://github.com/owner/repo.git', remoteHost: 'GitHub' },
  { origin: 'git@gitlab.com:owner/repo.git', remoteHost: 'GitLab' },
  { origin: 'ssh://git@bitbucket.org/owner/repo.git', remoteHost: 'Bitbucket' },
  {
    origin: 'https://git.example.com/owner/repo.git',
    remoteHost: 'git.example.com',
  },
  { origin: '/srv/git/repo.git', remoteHost: null },
  { origin: 'file:///srv/git/repo.git', remoteHost: null },
])(
  "names where a Project's origin $origin is hosted as $remoteHost",
  async ({ origin, remoteHost }): Promise<void> => {
    const { caller, git } = await startProjectTestHost();
    await git('remote', 'add', 'origin', origin);
    expect(await caller.projects.list()).toEqual([
      expect.objectContaining({ remoteHost, folderExists: true }),
    ]);
  },
);

it('lists a Project without an origin as having no remote host', async (): Promise<void> => {
  const { caller } = await startProjectTestHost();
  expect(await caller.projects.list()).toEqual([
    expect.objectContaining({ remoteHost: null }),
  ]);
});

it('rejects, reports and counts an origin URL without a host, and still lists the Project', async (): Promise<void> => {
  const { caller, git } = await startProjectTestHost();
  await git('remote', 'add', 'origin', 'https://');
  const errors = vi.spyOn(console, 'error').mockImplementation((): void => {});
  onTestFinished((): void => errors.mockRestore());
  expect(await caller.projects.list()).toEqual([
    expect.objectContaining({ id: 'project-1', remoteHost: null }),
  ]);
  expect(errors.mock.calls.map(([line]): string => String(line))).toEqual([
    expect.stringMatching(/^git: rejected remote URL response #\d+$/),
  ]);
});

it('lists a Project whose folder is gone beside the Projects that are still there', async (): Promise<void> => {
  const { database, caller } = await startProjectTestHost();
  database
    .insert(project)
    .values({ id: 'project-gone', path: missingFolder, name: 'old-api' })
    .run();
  expect(await caller.projects.list()).toEqual([
    expect.objectContaining({ id: 'project-1', folderExists: true }),
    expect.objectContaining({
      id: 'project-gone',
      folderExists: false,
      remoteHost: null,
      checkoutChoice: { type: 'main' },
    }),
  ]);
});
