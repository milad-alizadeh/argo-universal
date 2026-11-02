import type { ProjectsListOutput, SessionInfo } from '@repo/contracts';
import {
  nestedSessionEntries,
  type SessionTree,
} from './sessions-list/sessions-list-nesting';

export type SessionsListEntry =
  | { kind: 'project'; id: string; projectId: string; name: string }
  | {
      kind: 'session';
      id: string;
      session: SessionInfo;
      tree?: SessionTree;
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

// Newest created first, ties by id.
const newestFirst = (a: SessionInfo, b: SessionInfo): number =>
  b.createdAt - a.createdAt || a.sessionId.localeCompare(b.sessionId);

function projectSessions(
  sessionsByProject: Map<string, SessionInfo[]>,
  projectId: string,
): SessionInfo[] {
  return [...(sessionsByProject.get(projectId) ?? [])].sort(newestFirst);
}

function projectBody(
  project: ListedProject,
  projectSessions: SessionInfo[],
): SessionsListEntry[] {
  if (projectSessions.length === 0)
    return [{ kind: 'empty', id: `empty:${project.id}` }];

  return nestedSessionEntries(projectSessions);
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

// One list, or search results, newest created first, with no Project headings; only listed Projects' Sessions show.
export function flatEntries({
  projects,
  sessions,
}: Pick<ListEntriesInput, 'projects' | 'sessions'>): SessionsListEntry[] {
  const listed = new Set(projects.map((project) => project.id));

  return nestedSessionEntries(
    sessions
      .filter((session) => listed.has(session.projectId))
      .sort(newestFirst),
  );
}

// The Sessions list's rows, in Project order: each Project's heading, then its Sessions, newest created first, or an empty row.
export function listEntries({
  projects,
  sessions,
  collapsed,
  hideEmptyProjects,
}: ListEntriesInput): SessionsListEntry[] {
  const sessionsByProject = groupByProject(sessions);

  return projects.flatMap((project) => {
    const listed = projectSessions(sessionsByProject, project.id);

    if (hideEmptyProjects && listed.length === 0) return [];

    return projectEntries(project, listed, collapsed);
  });
}
