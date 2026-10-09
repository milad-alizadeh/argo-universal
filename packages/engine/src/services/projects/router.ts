import {
  ProjectsBranchesInput,
  ProjectsBranchesOutput,
  ProjectsListOutput,
} from '@repo/contracts';
import { listBranches } from '@repo/git';
import { publicProcedure, router } from '../../engine/trpc';
import { readProjects, readProjectPath } from './project';

export const projectsRouter = router({
  branches: publicProcedure
    .input(ProjectsBranchesInput)
    .output(ProjectsBranchesOutput)
    .query(({ ctx, input }): Promise<ProjectsBranchesOutput> =>
      listBranches(readProjectPath(ctx.database, input.projectId)),
    ),
  list: publicProcedure
    .output(ProjectsListOutput)
    .query(({ ctx }): Promise<ProjectsListOutput> =>
      readProjects(ctx.database, ctx.projectRejections),
    ),
});
