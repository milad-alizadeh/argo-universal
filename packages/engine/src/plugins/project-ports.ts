import { ProjectsBranchesInput, PromptQueue, type Turn } from '@repo/contracts';
import type { PluginSessionInfo } from '@repo/contracts/plugins/argo-calls';
import type { Database } from '@repo/db';
import { readCurrentBranch } from '@repo/git';
import {
  readPluginProjects,
  readProjectPath,
  readProjectPaths,
  watchProjectChanges,
} from '../projects';
import { readLatestTurn, readSessionRow } from '../sessions';
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

type SessionRow = NonNullable<ReturnType<typeof readSessionRow>>;

type RowSources = { database: Database; writer: WriterActorRef };

// A Prompt waits or the queue is paused; a queue that cannot be read counts as work too.
function queueHasWork({ promptQueue }: SessionRow): boolean {
  const queue = PromptQueue.safeParse(promptQueue);

  return queue.success
    ? [queue.data.items.length > 0, queue.data.pauseReason !== null].some(
        Boolean,
      )
    : true;
}

// A Turn runs, or the queue has work.
const busy = (row: SessionRow, latest?: Turn): boolean =>
  [latest?.status === 'running', queueHasWork(row)].some(Boolean);

const lastActivity = (row: SessionRow, latest?: Turn): number =>
  Math.max(row.activityAt, latest?.endedAt ?? 0);

/*
 * How long the Session has had nothing happen, from its last Feed change or the end of its latest Turn, whichever is
 * later; null while a Turn runs or its queue has work.
 */
function idleFor(sources: RowSources, row: SessionRow): number | null {
  const latest = readLatestTurn(sources, row.id);

  if (busy(row, latest)) return null;

  return Math.max(Date.now() - lastActivity(row, latest), 0);
}

const sourcesOf = (options: ProjectSources): RowSources => ({
  database: options.database,
  writer: options.databaseWriter,
});

// A Session's Project, branch, title and idle time reach a Plugin; null when there is no such Session.
async function pluginSession(
  options: ProjectSources,
  sessionId: string,
): Promise<PluginSessionInfo | null> {
  const sources = sourcesOf(options);
  const row = readSessionRow(sources, sessionId);

  if (!row) return null;

  return {
    projectId: row.projectId,
    branch: await checkoutBranch(row),
    title: row.title,
    idleFor: idleFor(sources, row),
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
