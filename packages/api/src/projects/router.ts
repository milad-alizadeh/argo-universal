import {
  ProjectsBranchesInput,
  ProjectsBranchesOutput,
  ProjectsListOutput,
} from '@repo/contracts';
import { publicProcedure, router } from '../trpc';

export const projectsRouter = router({
  branches: publicProcedure
    .input(ProjectsBranchesInput)
    .output(ProjectsBranchesOutput)
    .query(
      ({
        ctx,
        input,
      }): Promise<{ branches: string[]; currentBranch: string | null }> =>
        ctx.services.projects.branches(input),
    ),
  list: publicProcedure.output(ProjectsListOutput).query(
    ({
      ctx,
    }): Promise<
      {
        id: string;
        path: string;
        name: string;
        createdAt: number;
        checkoutChoice:
          | { type: 'worktree'; baseBranch: string }
          | { type: 'main' };
      }[]
    > => ctx.services.projects.list(),
  ),
});
