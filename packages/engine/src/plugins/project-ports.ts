import { ProjectsBranchesInput } from '@repo/contracts';
import type { Database } from '@repo/db';
import {
  readPluginProjects,
  readProjectPath,
  readProjectPaths,
  watchProjectChanges,
} from '../projects';
import type { WriterActorRef } from '../storage';
import type { createPluginRuntime } from './runtime/create-runtime';

type ProjectSources = { database: Database; databaseWriter: WriterActorRef };

export function projectPorts(
  options: ProjectSources,
): Pick<
  Parameters<typeof createPluginRuntime>[1],
  'watchProjects' | 'projects' | 'projectInfo' | 'projectPath'
> {
  return {
    watchProjects: (changed) =>
      watchProjectChanges(options.database, changed, options.databaseWriter),
    projects: async () => readProjectPaths(options.database),
    projectInfo: async () => readPluginProjects(options.database),
    projectPath: async (projectId) => pluginProjectPath(options, projectId),
  };
}

function pluginProjectPath(options: ProjectSources, projectId: string): string {
  return readProjectPath(
    options.database,
    ProjectsBranchesInput.parse({ projectId }).projectId,
  );
}
