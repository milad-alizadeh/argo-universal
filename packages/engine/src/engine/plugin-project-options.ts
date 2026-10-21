import { ProjectsBranchesInput } from '@repo/contracts';
import type { createPluginRuntime } from '../plugins';
import {
  readPluginProjects,
  readProjectPath,
  readProjectPaths,
  watchProjectChanges,
} from '../projects';
import type { HttpServerOptions } from './http-server';

export function projectOptions(
  options: HttpServerOptions,
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

function pluginProjectPath(
  options: HttpServerOptions,
  projectId: string,
): string {
  return readProjectPath(
    options.database,
    ProjectsBranchesInput.parse({ projectId }).projectId,
  );
}
