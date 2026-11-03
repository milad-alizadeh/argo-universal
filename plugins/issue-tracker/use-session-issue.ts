import { useCallback } from '@argo/plugin-kit';
import type { IssueDeps } from './issue-deps';
import type { Project } from './issue-project';
import type { IssueLink } from './tracker-storage';
import { type Called, useCall } from './use-call';

// The Issue a Session is attached to, in the Project it belongs to.
export type Attached = { project: Project; number: number };

/*
 * The Issue this Session was most recently attached to, or `null` when it has none or the page has no Session. It is
 * read again each time an Agent attaches or detaches an Issue, and the last answer stays while the next is read, so a
 * card moving from one Issue to another never draws nothing in between.
 */
export function useSessionIssue(
  deps: IssueDeps,
  sessionId: string | undefined,
): Called<Attached | null> {
  return useCall(
    useCallback(() => loadAttached(deps, sessionId), [deps, sessionId]),
    deps.links.subscribe,
  );
}

// The Issue this Session was most recently attached to, if its Project is still there.
async function loadAttached(
  deps: IssueDeps,
  sessionId: string | undefined,
): Promise<Attached | null> {
  if (sessionId === undefined) return null;

  const [link] = await deps.storage.sessionLinks([sessionId]);

  return link ? attachedIssue(deps, link) : null;
}

async function attachedIssue(
  deps: IssueDeps,
  { projectId, number }: IssueLink,
): Promise<Attached | null> {
  const projects = await deps.listProjects();
  const project = projects.find(({ id }) => id === projectId);

  return project ? { project, number } : null;
}
