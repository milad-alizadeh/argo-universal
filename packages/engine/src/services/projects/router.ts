import {
  ProjectsBranchesInput,
  ProjectsBranchesOutput,
  ProjectsListOutput,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { listBranches } from '@repo/git';
import { createRejectionCounter } from '@repo/machine-log';
import { publicProcedure, router, routerFactory } from '../../rpc';
import { readProjects, readProjectPath } from './project';

type ProjectsDeps = { database: Database };

const createProjectsReader = ({
  database,
}: ProjectsDeps): (() => Promise<ProjectsListOutput>) => {
  const rejections = createRejectionCounter('projects');
  return () => readProjects(database, rejections);
};

export const createProjectsRouter = routerFactory((deps: ProjectsDeps) =>
  router({
    branches: publicProcedure
      .input(ProjectsBranchesInput)
      .output(ProjectsBranchesOutput)
      .query(({ input }): Promise<ProjectsBranchesOutput> =>
        listBranches(readProjectPath(deps.database, input.projectId)),
      ),
    list: publicProcedure
      .output(ProjectsListOutput)
      .query(createProjectsReader(deps)),
  }),
);
