import type { ProjectsListOutput, SessionInfo } from '@repo/contracts';
import type { SessionsOrder } from '../stores/sessions-view';

export type SessionsListEntry =
  | { kind: 'project'; id: string; projectId: string; name: string }
  | {
      kind: 'session';
      id: string;
      session: SessionInfo;
    }
  | { kind: 'empty'; id: string };

export interface ListEntriesInput {
  projects: ProjectsListOutput;
  sessions: SessionInfo[];
  collapsed: ReadonlySet<string>;
  hideEmptyProjects: boolean;
  order: SessionsOrder;
}

type ListedProject = ProjectsListOutput[number];

function groupByProject(sessions: SessionInfo[]): Map<string, SessionInfo[]> {
  const sessionsByProject = new Map<string, SessionInfo[]>();

  for (const session of sessions) {
    const projectSessions = sessionsByProject.get(session.projectId) ?? [];
    projectSessions.push(session);
    sessionsByProject.set(session.projectId, projectSessions);
  }

  return sessionsByProject;
}

const orderTimes = {
  activity: (session: SessionInfo): number => session.activityAt,
  created: (session: SessionInfo): number => session.createdAt,
} satisfies Record<SessionsOrder, (session: SessionInfo) => number>;

// Newest first by the order's time, ties by id.
function newestFirst(
  order: SessionsOrder,
): (a: SessionInfo, b: SessionInfo) => number {
  const time = orderTimes[order];

  return (a, b) => time(b) - time(a) || a.sessionId.localeCompare(b.sessionId);
}

function projectSessions(
  sessionsByProject: Map<string, SessionInfo[]>,
  projectId: string,
  order: SessionsOrder,
): SessionInfo[] {
  return [...(sessionsByProject.get(projectId) ?? [])].sort(newestFirst(order));
}

function projectBody(
  project: ListedProject,
  projectSessions: SessionInfo[],
): SessionsListEntry[] {
  if (projectSessions.length === 0)
    return [{ kind: 'empty', id: `empty:${project.id}` }];

  return projectSessions.map(sessionEntry);
}

function projectEntries(
  project: ListedProject,
  projectSessions: SessionInfo[],
  collapsed: ReadonlySet<string>,
): SessionsListEntry[] {
  const headingId = `project:${project.id}`;

  const heading: SessionsListEntry = {
    kind: 'project',
    id: headingId,
    name: project.name,
    projectId: project.id,
  };

  if (collapsed.has(headingId)) return [heading];

  return [heading, ...projectBody(project, projectSessions)];
}

function sessionEntry(session: SessionInfo): SessionsListEntry {
  return {
    kind: 'session',
    id: session.sessionId,
    session,
  };
}

// One list, or search results, newest first in the order chosen, with no Project headings; only listed Projects' Sessions show.
export function flatEntries({
  projects,
  sessions,
  order,
}: Pick<
  ListEntriesInput,
  'projects' | 'sessions' | 'order'
>): SessionsListEntry[] {
  const listed = new Set(projects.map((project) => project.id));

  return sessions
    .filter((session) => listed.has(session.projectId))
    .sort(newestFirst(order))
    .map(sessionEntry);
}

// The Sessions list's rows, in Project order: each Project's heading, then its Sessions, newest first in the order chosen, or an empty row.
export function listEntries({
  projects,
  sessions,
  collapsed,
  hideEmptyProjects,
  order,
}: ListEntriesInput): SessionsListEntry[] {
  const sessionsByProject = groupByProject(sessions);

  return projects.flatMap((project) => {
    const listed = projectSessions(sessionsByProject, project.id, order);

    if (hideEmptyProjects && listed.length === 0) return [];

    return projectEntries(project, listed, collapsed);
  });
}
