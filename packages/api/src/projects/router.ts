import { ProjectsListOutput } from '@repo/contracts';
import { publicProcedure, router } from '../trpc';

export const projectsRouter = router({
  list: publicProcedure
    .output(ProjectsListOutput)
    .query(({ ctx }) => ctx.services.projects.list()),
});
