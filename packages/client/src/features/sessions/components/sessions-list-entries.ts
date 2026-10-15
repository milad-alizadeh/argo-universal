import type { ProjectsListOutput, SessionInfo } from '@repo/contracts';

export type SessionsListEntry =
  | { kind: 'project'; id: string; projectId: string; name: string }
  | {
      kind: 'session';
      id: string;
      session: SessionInfo;
      // Where the row sits among its Project's rows, so a phone's Compact rows round the ends of their section.
      first: boolean;
      last: boolean;
    }
  | { kind: 'empty'; id: string };

export interface ListEntriesInput {
  projects: ProjectsListOutput;
  sessions: SessionInfo[];
  collapsed: ReadonlySet<string>;
  hideEmptyProjects: boolean;
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

const byNewestActivity = (a: SessionInfo, b: SessionInfo): number =>
  b.activityAt - a.activityAt || a.sessionId.localeCompare(b.sessionId);

function newestFirst(
  sessionsByProject: Map<string, SessionInfo[]>,
  projectId: string,
): SessionInfo[] {
  return [...(sessionsByProject.get(projectId) ?? [])].sort(byNewestActivity);
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

function sessionEntry(
  session: SessionInfo,
  index: number,
  rows: readonly SessionInfo[],
): SessionsListEntry {
  return {
    kind: 'session',
    id: session.sessionId,
    session,
    first: index === 0,
    last: index === rows.length - 1,
  };
}

// Search results as one list, newest activity first, with no Project headings; only listed Projects' Sessions show.
export function flatEntries({
  projects,
  sessions,
}: Pick<ListEntriesInput, 'projects' | 'sessions'>): SessionsListEntry[] {
  const listed = new Set(projects.map((project) => project.id));

  return sessions
    .filter((session) => listed.has(session.projectId))
    .sort(byNewestActivity)
    .map(sessionEntry);
}

// The Sessions list's rows, in Project order: each Project's heading, then its Sessions or an empty row.
export function listEntries({
  projects,
  sessions,
  collapsed,
  hideEmptyProjects,
}: ListEntriesInput): SessionsListEntry[] {
  const sessionsByProject = groupByProject(sessions);

  return projects.flatMap((project) => {
    const projectSessions = newestFirst(sessionsByProject, project.id);

    if (hideEmptyProjects && projectSessions.length === 0) return [];

    return projectEntries(project, projectSessions, collapsed);
  });
}
