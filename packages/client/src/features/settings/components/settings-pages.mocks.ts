import type { ProjectInfo } from '@repo/contracts';
import { newSessionProjects } from '@repo/mocks/app';

const [worktreeProject, localProject] = ((): [
  (typeof newSessionProjects)[number],
  (typeof newSessionProjects)[number],
] => {
  const worktree = newSessionProjects.find(
    (project) => project.checkoutChoice.type === 'worktree',
  );

  const local = newSessionProjects.find(
    (project) => project.checkoutChoice.type === 'main',
  );

  if (!worktree || !local)
    throw new Error('Recorded Projects need a worktree and a local checkout.');

  return [worktree, local];
})();

// A Project whose folder was moved or deleted on the Server.
export const missingFolderProject: ProjectInfo = {
  id: 'project-old-api',
  name: 'old-api',
  path: '/projects/old-api',
  createdAt: localProject.createdAt + 1,
  checkoutChoice: { type: 'main' },
  remoteHost: null,
  folderExists: false,
};

export const settingsProjects: ProjectInfo[] = [
  ...newSessionProjects,
  missingFolderProject,
];

export { localProject, worktreeProject };

// A paired Device's name, for a Project that is not on the Server Device.
export const otherDeviceName = 'Studio MacBook Pro';
