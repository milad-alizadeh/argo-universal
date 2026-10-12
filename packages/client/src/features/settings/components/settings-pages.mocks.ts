import { newSessionProjects, serverInfo } from '@repo/mocks/app';

export const serverCaption = `On ${serverInfo.name}`;

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

export {
  localProject,
  newSessionProjects as settingsProjects,
  worktreeProject,
};

// A paired Device's name, for a Project that is not on the Server Device.
export const otherDeviceName = 'Studio MacBook Pro';
