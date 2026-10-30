import { ProjectsBranchesInput } from '@repo/contracts';
import type { PluginSessionInfo } from '@repo/contracts/plugins/argo-calls';
import type { Database } from '@repo/db';
import {
  readPluginProjects,
  readProjectPath,
  readProjectPaths,
  watchProjectChanges,
} from '../projects';
import { readSessionRow } from '../sessions';
import type { WriterActorRef } from '../storage';
import type { createPluginRuntime } from './runtime/create-runtime';

type ProjectSources = { database: Database; databaseWriter: WriterActorRef };

export function projectPorts(
  options: ProjectSources,
): Pick<
  Parameters<typeof createPluginRuntime>[1],
  'watchProjects' | 'projects' | 'projectInfo' | 'projectPath' | 'sessionInfo'
> {
  return {
    watchProjects: (changed) =>
      watchProjectChanges(options.database, changed, options.databaseWriter),
    projects: async () => readProjectPaths(options.database),
    projectInfo: async () => readPluginProjects(options.database),
    projectPath: async (projectId) => pluginProjectPath(options, projectId),
    sessionInfo: async (sessionId) => pluginSession(options, sessionId),
  };
}

// Only a Session's Project and branch reach a Plugin; null when there is no such Session.
function pluginSession(
  options: ProjectSources,
  sessionId: string,
): PluginSessionInfo | null {
  const row = readSessionRow(
    { database: options.database, writer: options.databaseWriter },
    sessionId,
  );

  if (!row) return null;

  return {
    projectId: row.projectId,
    branch: row.checkoutBranch,
    title: row.title,
  };
}

function pluginProjectPath(options: ProjectSources, projectId: string): string {
  return readProjectPath(
    options.database,
    ProjectsBranchesInput.parse({ projectId }).projectId,
  );
}
