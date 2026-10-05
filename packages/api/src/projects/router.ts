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
    .query(({ ctx, input }) => ctx.services.projects.branches(input)),
  list: publicProcedure
    .output(ProjectsListOutput)
    .query(({ ctx }) => ctx.services.projects.list()),
});
