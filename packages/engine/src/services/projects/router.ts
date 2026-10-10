import {
  ProjectsBranchesInput,
  ProjectsBranchesOutput,
  ProjectsListOutput,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { listBranches } from '@repo/git';
import { createRejectionCounter } from '@repo/machine-log';
import { publicProcedure, routerFactory } from '../../rpc';
import { readProjects, readProjectPath } from './project';

const createProjectList = (
  database: Database,
): (() => Promise<ProjectsListOutput>) => {
  const rejections = createRejectionCounter('projects');
  return () => readProjects(database, rejections);
};

export const createProjectsRouter = routerFactory((database: Database) => ({
  branches: publicProcedure
    .input(ProjectsBranchesInput)
    .output(ProjectsBranchesOutput)
    .query(({ input }): Promise<ProjectsBranchesOutput> =>
      listBranches(readProjectPath(database, input.projectId)),
    ),
  list: publicProcedure
    .output(ProjectsListOutput)
    .query(createProjectList(database)),
}));
