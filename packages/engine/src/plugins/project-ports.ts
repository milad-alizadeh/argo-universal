import { ProjectsBranchesInput, PromptQueue, type Turn } from '@repo/contracts';
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
import { readLatestTurn, readSessionRow } from '../sessions';
import type { WriterActorRef } from '../storage';
import type { createPluginRuntime } from './runtime/create-runtime';
import { SessionInfoCache } from './session-info-cache';

type ProjectSources = {
  database: Database;
  databaseWriter: WriterActorRef;
  readOrigin?: ReadOrigin;
  // The clock the kept Session answers age on; tests pass their own.
  now?: () => number;
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
  const sessions = new SessionInfoCache<Checkout, string | null>(options.now);

  return {
    ...projectReads(options),
    watchProjects: (changed) =>
      watchProjectChanges(options.database, changed, options.databaseWriter),
    projectPath: async (projectId) => pluginProjectPath(options, projectId),
    sessionInfo: async (sessionId) =>
      pluginSession(options, sessions, sessionId),
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

/*
 * A Session's Project, branch, title and idle time reach a Plugin; null when there is no such Session. The branch is a
 * `git` run, so it is kept while the Checkout is unchanged; the rest is read each time.
 */
async function pluginSession(
  options: ProjectSources,
  sessions: SessionInfoCache<Checkout, string | null>,
  sessionId: string,
): Promise<PluginSessionInfo | null> {
  const sources = sourcesOf(options);
  const row = readSessionRow(sources, sessionId);
  const checkout = row && checkoutOf(row);
  const branch = await sessions.read(sessionId, checkout, checkoutBranch);

  return row ? infoOf(sources, row, branch) : null;
}

const infoOf = (
  sources: RowSources,
  row: SessionRow,
  branch: string | null,
): PluginSessionInfo => ({
  projectId: row.projectId,
  branch,
  title: row.title,
  idleFor: idleFor(sources, row),
});

type Checkout = { checkoutPath: string; checkoutBranch: string | null };

// What the Session's branch is read from, so its kept branch outlives a change to the rest of its row.
const checkoutOf = ({ checkoutPath, checkoutBranch }: Checkout): Checkout => ({
  checkoutPath,
  checkoutBranch,
});

/*
 * The branch the Checkout is on now, which an Agent may have switched since the Session began; the stored branch
 * only when the Checkout cannot be read, as once it is removed.
 */
async function checkoutBranch(row: Checkout): Promise<string | null> {
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
