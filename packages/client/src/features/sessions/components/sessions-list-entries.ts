import type { ProjectsListOutput, SessionInfo } from '@repo/contracts';

export type SessionsListEntry =
  | { kind: 'project'; id: string; projectId: string; name: string }
  | { kind: 'session'; id: string; session: SessionInfo }
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
  return (sessionsByProject.get(projectId) ?? []).sort(byNewestActivity);
}

function projectBody(
  project: ListedProject,
  projectSessions: SessionInfo[],
): SessionsListEntry[] {
  if (projectSessions.length === 0)
    return [{ kind: 'empty', id: `empty:${project.id}` }];
  return projectSessions.map((session) => ({
    kind: 'session',
    id: session.sessionId,
    session,
  }));
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
