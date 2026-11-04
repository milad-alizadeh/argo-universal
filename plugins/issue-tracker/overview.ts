import type { Argo, NamedQuery } from '@argo/plugin-kit';
import type { TrackerClient } from './github-tracker';
import { openClient, projectById, type ClientSource } from './issue-client';
import { builtInFilters } from './issue-filters';

// The repository's labels and each counted filter's Issue count, by filter id.
export type Overview = { labels: string[]; counts: Record<string, number> };

// The overview of one Project, as the Query Argo keeps for it.
export type OverviewQuery = (args: {
  projectId: string;
}) => NamedQuery<Overview>;

type OverviewSource = Pick<ClientSource, 'storage' | 'trackers'> & {
  listProjects: Argo['projects']['list'];
};

/*
 * A Project's overview, a named read (ADR-0037): the sidebar on the root page and on every filter page
 * read the one answer Argo keeps for the Project, and a status change, which says `argo.changed()`, makes
 * it due.
 */
export const defineOverview = (
  argo: Argo,
  source: OverviewSource,
): OverviewQuery =>
  argo.queries.define('overview', ({ projectId }: { projectId: string }) =>
    readOverview(source, projectId),
  );

async function readOverview(
  { listProjects, ...source }: OverviewSource,
  projectId: string,
): Promise<Overview> {
  const project = await projectById(listProjects, projectId);

  if (!project) throw new Error('This Project no longer exists.');

  const client = await openClient({ ...source, project });
  await client.authStatus();

  const [labels, counts] = await Promise.all([
    client.listLabels(),
    countFilters(client),
  ]);

  return { labels, counts };
}

// A count GitHub refuses, such as past its search rate limit, only leaves its row without one.
async function countFilters(
  client: TrackerClient,
): Promise<Overview['counts']> {
  const counted = builtInFilters().filter((filter) => filter.counted);

  const entries = await Promise.all(
    counted.map((filter) =>
      client.countIssues(filter.search).then(
        (count): [string, number][] => [[filter.id, count]],
        () => [],
      ),
    ),
  );

  return Object.fromEntries(entries.flat());
}
