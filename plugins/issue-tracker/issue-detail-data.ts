import { githubError } from './github-errors';
import type { Issue } from './github-issues';
import { openDepsClient, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';

// A Session an Agent attached to this Issue, named as the App names it.
export type AttachedSession = {
  sessionId: string;
  title: string;
  branch: string | null;
};

// The Issue, or the line the page shows instead when it cannot be read.
type IssueRead = { ok: true; issue: Issue } | { ok: false; message: string };

// What one Issue's page shows: the Issue or why not, and the Sessions attached to it (none when none are).
export type IssueDetailData = IssueRead & { sessions: AttachedSession[] };

export type DetailSource = {
  project: Project;
  number: number;
  deps: IssueDeps;
};

// The Issue and its Sessions at once; an Issue that cannot be read says why in its place.
export async function loadIssueDetail(
  source: DetailSource,
): Promise<IssueDetailData> {
  const [read, sessions] = await Promise.all([
    readIssue(source),
    attachedSessions(source),
  ]);

  return { ...read, sessions };
}

async function readIssue(source: DetailSource): Promise<IssueRead> {
  try {
    const client = await openDepsClient(source);

    return { ok: true, issue: await client.getIssue(source.number) };
  } catch (cause) {
    return { ok: false, message: githubError(cause) };
  }
}

// The Sessions this Plugin stored for the Issue, each named by the App; one that has since gone is left out.
async function attachedSessions({
  deps,
  project,
  number,
}: DetailSource): Promise<AttachedSession[]> {
  const attached = await deps.storage
    .issueSessions({ projectId: project.id, number })
    .catch(() => []);

  const found = await Promise.all(
    attached.map(({ sessionId }) => namedSession(deps.getSession, sessionId)),
  );

  return found.flat();
}

async function namedSession(
  getSession: IssueDeps['getSession'],
  sessionId: string,
): Promise<AttachedSession[]> {
  const session = await getSession(sessionId).catch(() => null);

  if (!session) return [];

  return [{ sessionId, title: session.title, branch: session.branch }];
}
