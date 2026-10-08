import type { ProjectsBranchesOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { unreachableServices } from '#mocks/services';
import { appRouter } from '../../engine/router';

it('returns local branches and the current branch for a Project', async (): Promise<void> => {
  const caller = appRouter.createCaller({
    services: unreachableServices({
      projects: {
        branches: async (): Promise<ProjectsBranchesOutput> => ({
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
