import { expect, it } from 'vitest';
import { unreachableServices } from '../../mocks';
import { appRouter } from '../root';

it('returns local branches and the current branch for a Project', async () => {
  const caller = appRouter.createCaller({
    services: unreachableServices({
      projects: {
        branches: async () => ({
          branches: ['main', 'feature'],
          currentBranch: 'feature',
        }),
      },
    }),
  });
  await expect(
    caller.projects.branches({ projectId: 'project-1' }),
  ).resolves.toEqual({
    branches: ['main', 'feature'],
    currentBranch: 'feature',
  });
});
