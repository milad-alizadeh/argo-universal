import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { SignInRequired } from './github-api';
import type { Issue } from './github-issues';
import type { TrackerClient } from './github-tracker';
import { openClient, projectById, type ClientSource } from './issue-client';
import type { Overview } from './overview';

/*
 * What a read answers: the value, or why there is none. Argo keeps the answer, so a rejected token is an answer
 * too: the page draws the sign-in until a sign-in says `argo.changed()` and the read runs again.
 */
export type Settled<Value> =
  | { ok: true; value: Value }
  | { ok: false; signIn: boolean; message: string };

// The value of a read, or the error its page handles: `SignInRequired` draws the sign-in.
export function unwrap<Value>(settled: Settled<Value>): Value {
  if (settled.ok) return settled.value;

  throw settled.signIn
    ? new SignInRequired(settled.message)
    : new Error(settled.message);
}

// A rejected sign-in is the page's to answer, so it is thrown; any other failure is a line the page can show.
function throwIfSignIn(settled: Settled<unknown>): void {
  if (!settled.ok && settled.signIn) unwrap(settled);
}

export type Answered<Value> = { value: Value | null; message: string };

export async function answered<Value>(
  read: Promise<Settled<Value>>,
): Promise<Answered<Value>> {
  const settled = await read;

  throwIfSignIn(settled);

  return settled.ok
    ? { value: settled.value, message: '' }
    : { value: null, message: settled.message };
}

async function settle<Value>(
  run: () => Promise<Value>,
): Promise<Settled<Value>> {
  try {
    return { ok: true, value: await run() };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);

    return { ok: false, signIn: cause instanceof SignInRequired, message };
  }
}

type Source = Pick<ClientSource, 'storage' | 'trackers'> & {
  listProjects: Argo['projects']['list'];
};

type Target = { projectId: string };

export type IssuesTarget = Target & { search: string; limit: number };

export type IssueTarget = Target & { number: number };

export type GitHubReads = {
  // A Project's labels and counts: one GitHub call.
  overview: (args: Target) => NamedQuery<Settled<Overview>>;
  // One page of a Project's Issues for a search, newest first.
  issues: (args: IssuesTarget) => NamedQuery<Settled<Issue[]>>;
  issue: (args: IssueTarget) => NamedQuery<Settled<Issue>>;
};

async function clientFor(
  source: Source,
  projectId: string,
): Promise<TrackerClient> {
  const project = await projectById(source.listProjects, projectId);

  if (!project) throw new Error('This Project no longer exists.');

  return openClient({ ...source, project });
}

// A list's Issues are read in full, so each seeds the entry a page opened from its row, or a Slot's summary, reads next.
async function listed(
  source: Source,
  seed: (issue: Issue) => Promise<void>,
  { projectId, search, limit }: IssuesTarget,
): Promise<Issue[]> {
  const client = await clientFor(source, projectId);
  const issues = await client.listIssues(search, limit);

  await Promise.all(issues.map(seed));

  return issues;
}

// Each read is kept for the Project its args name, so a page drawn for a Project and a Slot share its entry.
const byProject = { projectOf: ({ projectId }: Target): string => projectId };

/*
 * A named read (ADR-0037): every page and Slot that asks the same question shares the one entry Argo keeps for it, and a
 * status change or a sign-in, which say `argo.changed()`, make it due.
 */
const issueRead = (argo: Argo, source: Source): GitHubReads['issue'] =>
  argo.queries.define(
    'issue',
    ({ projectId, number }: IssueTarget) =>
      settle(async () => (await clientFor(source, projectId)).getIssue(number)),
    byProject,
  );

// Seeds the entry of each Issue a list read in full, as the Query a page or a Slot's summary would read it.
const seeding =
  (argo: Argo, issue: GitHubReads['issue'], projectId: string) =>
  (found: Issue): Promise<void> =>
    argo.queries.seed(issue({ projectId, number: found.number }), {
      ok: true,
      value: found,
    });

const overviewRead = (argo: Argo, source: Source): GitHubReads['overview'] =>
  argo.queries.define(
    'overview',
    ({ projectId }: Target) =>
      settle(async () => (await clientFor(source, projectId)).overview()),
    byProject,
  );

const issuesRead = (
  argo: Argo,
  source: Source,
  issue: GitHubReads['issue'],
): GitHubReads['issues'] =>
  argo.queries.define(
    'issues',
    (target: IssuesTarget) =>
      settle(() =>
        listed(source, seeding(argo, issue, target.projectId), target),
      ),
    byProject,
  );

export function defineReads(argo: Argo, source: Source): GitHubReads {
  const issue = issueRead(argo, source);

  return {
    issue,
    overview: overviewRead(argo, source),
    issues: issuesRead(argo, source, issue),
  };
}
