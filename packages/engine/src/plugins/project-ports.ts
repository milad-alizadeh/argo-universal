import { ProjectsBranchesInput } from '@repo/contracts';
import type { PluginSessionInfo } from '@repo/contracts/plugins/argo-calls';
import type { Database } from '@repo/db';
import { readCurrentBranch } from '@repo/git';
import {
  readPluginProjectIds,
  readPluginProjects,
  readProjectPath,
  readProjectPaths,
  watchProjectChanges,
  type ReadOrigin,
} from '../projects';
import { readSessionRow } from '../sessions';
import type { WriterActorRef } from '../storage';
import type { createPluginRuntime } from './runtime/create-runtime';

type ProjectSources = {
  database: Database;
  databaseWriter: WriterActorRef;
  readOrigin?: ReadOrigin;
};

type ProjectPorts = Pick<
  Parameters<typeof createPluginRuntime>[1],
  | 'watchProjects'
  | 'projects'
  | 'projectIds'
  | 'projectInfo'
  | 'projectPath'
  | 'sessionInfo'
>;

export function projectPorts(options: ProjectSources): ProjectPorts {
  return {
    ...projectReads(options),
    watchProjects: (changed) =>
      watchProjectChanges(options.database, changed, options.databaseWriter),
    projectPath: async (projectId) => pluginProjectPath(options, projectId),
    sessionInfo: async (sessionId) => pluginSession(options, sessionId),
  };
}

function projectReads({
  database,
  readOrigin,
}: ProjectSources): Pick<
  ProjectPorts,
  'projects' | 'projectIds' | 'projectInfo'
> {
  return {
    projects: async () => readProjectPaths(database),
    projectIds: async () => readPluginProjectIds(database),
    projectInfo: async () => readPluginProjects(database, readOrigin),
  };
}

// Only a Session's Project and branch reach a Plugin; null when there is no such Session.
async function pluginSession(
  options: ProjectSources,
  sessionId: string,
): Promise<PluginSessionInfo | null> {
  const row = readSessionRow(
    { database: options.database, writer: options.databaseWriter },
    sessionId,
  );

  if (!row) return null;

  return {
    projectId: row.projectId,
    branch: await checkoutBranch(row),
    title: row.title,
  };
}

/*
 * The branch the Checkout is on now, which an Agent may have switched since the Session began; the stored branch
 * only when the Checkout cannot be read, as once it is removed.
 */
async function checkoutBranch(row: {
  checkoutPath: string;
  checkoutBranch: string | null;
}): Promise<string | null> {
  try {
    return await readCurrentBranch(row.checkoutPath);
  } catch {
    return row.checkoutBranch;
  }
}

function pluginProjectPath(options: ProjectSources, projectId: string): string {
  return readProjectPath(
    options.database,
    ProjectsBranchesInput.parse({ projectId }).projectId,
  );
}
