import { readGraphql, type GitHubQuery, type RawRead } from './github-api';
import { issueQuery, mapIssueDetail } from './github-documents';
import type { Issue } from './github-issues';
import { githubRepositoryFromOrigin } from './github-repository';
import type { IssueDeps } from './issue-deps';
import type { IssueLink } from './tracker-storage';
import { freshForMs } from './use-github';

// What a Session row and the Session bar say about an Issue: its state, and its title for a tooltip.
export type IssueSummary = Pick<Issue, 'title' | 'status' | 'closedAs'>;

type Source = Pick<IssueDeps, 'listProjects' | 'fetch'>;

type Target = Pick<IssueLink, 'projectId' | 'number'>;

export type IssueSummaries = {
  // The last summary this Plugin stored for the Issue; `null` until one has loaded.
  cached: (target: Target) => Promise<IssueSummary | null>;
  // Loads each Issue's summary in the background and tells Argo, through `changed`, when one differs from the stored.
  refresh: (targets: readonly Target[]) => void;
  // The Issue's state changed, so the next ask loads it again whatever its age.
  stale: (number: number) => void;
};

type Loads = {
  loadedAt: Map<string, number>;
  load: (target: Target) => Promise<void>;
};

const keyOf = ({ projectId, number }: Target): string =>
  `${projectId}#${number}`;

/*
 * The batched Slot call answers inside two seconds, and GitHub can take longer, so the Slots answer from the summary
 * kept so far and load a fresh one on the side. A summary that differs is kept and `changed` is called, which asks the
 * Slots again. A Slot is not a view, so it cannot watch a Query: it makes the same call a page's Query makes, kept in
 * memory for a minute.
 */
export function createIssueSummaries(
  source: Source,
  changed: () => Promise<void>,
): IssueSummaries {
  const loadedAt = new Map<string, number>();
  const kept = new Map<string, IssueSummary>();

  const cached: IssueSummaries['cached'] = (target) =>
    Promise.resolve(kept.get(keyOf(target)) ?? null);

  const load = loadSummary(source, kept, changed);

  return {
    cached,
    refresh: (targets) => refreshAll({ loadedAt, load }, targets),
    stale: (number) => forget(loadedAt, number),
  };
}

function loadSummary(
  source: Source,
  kept: Map<string, IssueSummary>,
  changed: () => Promise<void>,
): Loads['load'] {
  return async (target) => {
    const summary = await summaryOf(source, target);
    const key = keyOf(target);

    if (JSON.stringify(summary) === JSON.stringify(kept.get(key))) return;

    kept.set(key, summary);
    await changed();
  };
}

function refreshAll(loads: Loads, targets: readonly Target[]): void {
  const unique = new Map(targets.map((target) => [keyOf(target), target]));

  for (const target of unique.values()) refreshOne(loads, target);
}

function refreshOne({ loadedAt, load }: Loads, target: Target): void {
  const key = keyOf(target);
  const last = loadedAt.get(key);

  if (last !== undefined && Date.now() - last < freshForMs) return;

  loadedAt.set(key, Date.now());
  void load(target).catch(() => loadedAt.delete(key));
}

function forget(loadedAt: Loads['loadedAt'], number: number): void {
  for (const key of loadedAt.keys())
    if (key.endsWith(`#${number}`)) loadedAt.delete(key);
}

async function repositoryOf(
  source: Source,
  projectId: string,
): Promise<string> {
  const projects = await source.listProjects();
  const project = projects.find(({ id }) => id === projectId);

  if (!project) throw new Error('This Project no longer exists.');

  const repository = githubRepositoryFromOrigin(project.originUrl);

  if (!repository) throw new Error('This Project has no GitHub remote.');

  return repository;
}

const requestOf = (
  { method, headers, body, account }: GitHubQuery,
  projectId: string,
): Parameters<Source['fetch']>[1] => ({
  method,
  headers,
  body,
  account,
  projectId,
});

async function rawIssue(
  source: Source,
  { projectId, number }: Target,
  repository: string,
): Promise<RawRead> {
  const query = issueQuery(repository, number);
  const response = await source.fetch(query.url, requestOf(query, projectId));

  return response
    ? {
        data: { status: response.status, body: await response.text() },
        error: undefined,
      }
    : { data: undefined, error: 'Account is unavailable' };
}

async function summaryOf(
  source: Source,
  target: Target,
): Promise<IssueSummary> {
  const repository = await repositoryOf(source, target.projectId);
  const raw = await rawIssue(source, target, repository);
  const read = readGraphql(raw, mapIssueDetail);

  if (read.kind !== 'ok') throw new Error('The Issue could not be read.');

  const { title, status, closedAs } = read.value;

  return { title, status, closedAs };
}
