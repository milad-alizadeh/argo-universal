import { ProjectsBranchesInput, ProjectsBranchesOutput } from '@repo/contracts';
import type { Database } from '@repo/db';
import { listBranches } from '@repo/git';
import { publicProcedure, router, routerFactory } from '../rpc';
import { readProjectPath } from './project';

type ProjectsDeps = { database: Database };

export const createProjectsRouter = routerFactory((deps: ProjectsDeps) =>
  router({
    branches: publicProcedure
      .input(ProjectsBranchesInput)
      .output(ProjectsBranchesOutput)
      .query(({ input }): Promise<ProjectsBranchesOutput> =>
        listBranches(readProjectPath(deps.database, input.projectId)),
      ),
  }),
);
