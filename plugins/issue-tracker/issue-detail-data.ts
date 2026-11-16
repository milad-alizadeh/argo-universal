import type { LoaderInput } from '@argo/plugin-kit';
import { SignInRequired } from './github-api';
import type { Choices } from './github-edits';
import type { Issue } from './github-issues';
import { unwrap } from './github-reads';
import type { Project } from './issue-client';
import type { IssueDeps } from './issue-deps';

// A Session an Agent attached to this Issue; the App draws its row from the live Session.
export type AttachedSession = { sessionId: string };

// The Issue, or the line the page shows instead when it cannot be read.
type IssueRead = { ok: true; issue: Issue } | { ok: false; message: string };

// The labels and people to choose from, or why they could not be read: the Issue still shows without them.
export type ChoicesRead = { choices: Choices | null; choicesError: string };

// What one Issue's page shows: the Issue or why not, the labels and people to choose from, and the Sessions attached to it (none when none are).
export type IssueDetailData = IssueRead &
  ChoicesRead & { sessions: AttachedSession[] };

export type DetailSource = {
  project: Project;
  number: number;
  deps: IssueDeps;
  read: LoaderInput<Record<never, never>>['read'];
};

// The Issue and its Sessions at once; an Issue that cannot be read says why in its place.
export async function loadIssueDetail(
  source: DetailSource,
): Promise<IssueDetailData> {
  const [read, choices, sessions] = await Promise.all([
    readIssue(source),
    readChoices(source),
    attachedSessions(source),
  ]);

  return { ...read, ...choices, sessions };
}

async function readIssue(source: DetailSource): Promise<IssueRead> {
  const { read, deps, project, number } = source;

  try {
    const query = deps.reads.issue({ projectId: project.id, number });

    return { ok: true, issue: unwrap(await read(query)) };
  } catch (cause) {
    // Signing in is the page's, not a line in place of the Issue.
    if (cause instanceof SignInRequired) throw cause;

    return { ok: false, message: String(Object(cause).message) };
  }
}

async function readChoices({
  read,
  deps,
  project,
}: DetailSource): Promise<ChoicesRead> {
  try {
    const query = deps.reads.choices({ projectId: project.id });

    return { choices: unwrap(await read(query)), choicesError: '' };
  } catch (cause) {
    if (cause instanceof SignInRequired) throw cause;

    return { choices: null, choicesError: String(Object(cause).message) };
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

  return [{ sessionId }];
}
