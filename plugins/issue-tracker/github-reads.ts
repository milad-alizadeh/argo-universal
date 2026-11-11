import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { SignInRequired } from './github-api';
import type { Issue } from './github-issues';
import type { TrackerClient } from './github-tracker';
import type { IssueCache } from './issue-cache';
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
  issueCache: IssueCache;
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

/*
 * The tracker's GitHub reads, named reads (ADR-0037): every page and Slot that asks the same question shares the
 * one answer Argo keeps for it, and a status change or a sign-in, which say `argo.changed()`, make it due.
 */
// A list's Issues are read in full, so each is kept for the page and Slot summary that ask for it next.
async function listed(
  source: Source,
  { projectId, search, limit }: IssuesTarget,
): Promise<Issue[]> {
  const issues = await (
    await clientFor(source, projectId)
  ).listIssues(search, limit);

  source.issueCache.seed(projectId, issues);

  return issues;
}

const issueOf = async (source: Source, target: IssueTarget): Promise<Issue> =>
  source.issueCache.get(target, async () =>
    (await clientFor(source, target.projectId)).getIssue(target.number),
  );

export const defineReads = (argo: Argo, source: Source): GitHubReads => ({
  overview: argo.queries.define('overview', ({ projectId }: Target) =>
    settle(async () => (await clientFor(source, projectId)).overview()),
  ),
  issues: argo.queries.define('issues', (target: IssuesTarget) =>
    settle(() => listed(source, target)),
  ),
  issue: argo.queries.define('issue', (target: IssueTarget) =>
    settle(() => issueOf(source, target)),
  ),
});
