import type { ProjectsListOutput, SessionInfo } from '@repo/contracts';

export type SessionsListEntry =
  | { kind: 'project'; id: string; projectId: string; name: string }
  | { kind: 'session'; id: string; session: SessionInfo }
  | { kind: 'empty'; id: string };

// The Sessions list's rows, in Project order: each Project's heading, then its Sessions or an empty row.
export function listEntries(
  projects: ProjectsListOutput,
  sessions: SessionInfo[],
  collapsed: ReadonlySet<string>,
  hideEmptyProjects: boolean,
): SessionsListEntry[] {
  const sessionsByProject = new Map<string, SessionInfo[]>();
  for (const session of sessions) {
    const projectSessions = sessionsByProject.get(session.projectId) ?? [];
    projectSessions.push(session);
    sessionsByProject.set(session.projectId, projectSessions);
  }
  const entries: SessionsListEntry[] = [];
  for (const project of projects) {
    const projectSessions = (sessionsByProject.get(project.id) ?? []).sort(
      (a, b) =>
        b.activityAt - a.activityAt || a.sessionId.localeCompare(b.sessionId),
    );
    if (hideEmptyProjects && projectSessions.length === 0) continue;
    const headingId = `project:${project.id}`;
    entries.push({
      kind: 'project',
      id: headingId,
      name: project.name,
      projectId: project.id,
    });
    if (collapsed.has(headingId)) continue;
    if (projectSessions.length === 0)
      entries.push({ kind: 'empty', id: `empty:${project.id}` });
    for (const session of projectSessions)
      entries.push({ kind: 'session', id: session.sessionId, session });
  }
  return entries;
}
