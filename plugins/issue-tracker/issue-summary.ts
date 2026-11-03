import { github } from './github-account';
import { readGraphql } from './github-api';
import { issueQuery, mapIssueDetail } from './github-documents';
import type { Issue } from './github-issues';
import { githubRepositoryFromOrigin } from './github-repository';
import type { IssueDeps } from './issue-deps';
import type { IssueLink } from './tracker-storage';
import { freshForMs } from './use-github';

// What a Session row and the Session bar say about an Issue: its state, and its title for a tooltip.
export type IssueSummary = Pick<Issue, 'title' | 'status' | 'closedAs'>;

type Source = Pick<IssueDeps, 'listProjects' | 'changes'>;

type Target = Pick<IssueLink, 'projectId' | 'number'>;

export type IssueSummaries = {
  // The last summary this Plugin stored for the Issue; `null` until one has loaded.
  cached: (target: Target) => Promise<IssueSummary | null>;
  // Loads each Issue's summary in the background and tells Argo, through `changed`, when one differs from the stored.
  refresh: (targets: readonly Target[]) => void;
};

const keyOf = ({ projectId, number }: Target): string =>
  `${projectId}#${number}`;

/*
 * The batched Slot call answers inside two seconds, and GitHub can take longer, so the Slots answer from the summary
 * kept so far and load a fresh one on the side. A summary that differs is kept and `changed` is called, which asks the
 * Slots again. A Slot is not a view, so it cannot watch a Query: it reads the entry an Issue's page watches, so whichever
 * asks first makes the one call (ADR-0037).
 */
export function createIssueSummaries(
  source: Source,
  changed: () => Promise<void>,
): IssueSummaries {
  const kept = new Map<string, IssueSummary>();
  const load = loadSummary(source, kept, changed);

  return {
    cached: (target) => Promise.resolve(kept.get(keyOf(target)) ?? null),
    refresh: (targets) => {
      const unique = new Map(targets.map((target) => [keyOf(target), target]));

      for (const target of unique.values()) void load(target).catch(() => {});
    },
  };
}

function loadSummary(
  source: Source,
  kept: Map<string, IssueSummary>,
  changed: () => Promise<void>,
): (target: Target) => Promise<void> {
  return async (target) => {
    const summary = await summaryOf(source, target);
    const key = keyOf(target);

    if (JSON.stringify(summary) === JSON.stringify(kept.get(key))) return;

    kept.set(key, summary);
    await changed();
  };
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

// A status changed here shows over GitHub's answer until that answer can be trusted to carry it, as on the pages.
function withRecentStatus(
  { changes }: Source,
  { number }: Target,
  summary: IssueSummary,
): IssueSummary {
  const status = changes.recent().get(number);

  return status && status !== summary.status
    ? { title: summary.title, status }
    : summary;
}

async function readIssue(
  repository: string,
  { projectId, number }: Target,
): Promise<ReturnType<typeof readGraphql<Issue>>> {
  const { data, error } = await github.read(issueQuery(repository, number), {
    projectId,
    every: freshForMs,
  });

  return readGraphql(
    { data: data && { status: data.status, body: data.body }, error },
    mapIssueDetail,
  );
}

async function summaryOf(
  source: Source,
  target: Target,
): Promise<IssueSummary> {
  const repository = await repositoryOf(source, target.projectId);
  const read = await readIssue(repository, target);

  if (read.kind !== 'ok') throw new Error('The Issue could not be read.');

  const { title, status, closedAs } = read.value;

  return withRecentStatus(source, target, { title, status, closedAs });
}
