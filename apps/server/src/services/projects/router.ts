import {
  ProjectsBranchesInput,
  ProjectsBranchesOutput,
  ProjectsListOutput,
} from '@repo/contracts';
import { publicProcedure, router } from '../../engine/trpc';

export const projectsRouter = router({
  branches: publicProcedure
    .input(ProjectsBranchesInput)
    .output(ProjectsBranchesOutput)
    .query(({ ctx, input }): Promise<ProjectsBranchesOutput> =>
      ctx.services.projects.branches(input),
    ),
  list: publicProcedure
    .output(ProjectsListOutput)
    .query(({ ctx }): Promise<ProjectsListOutput> =>
      ctx.services.projects.list(),
    ),
});
