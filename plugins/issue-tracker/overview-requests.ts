import type { TrackerClient } from './github-tracker';
import { openClient, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { builtInFilters } from './issue-filters';

// The repository's labels and each counted filter's Issue count, by filter id.
export type Overview = { labels: string[]; counts: Record<string, number> };

type CacheKey = Parameters<IssueDeps['storage']['readCache']>[0];

const cacheKey = (project: Project): CacheKey => ({
  projectId: project.id,
  view: 'overview',
});

export const readOverview = (
  deps: IssueDeps,
  project: Project,
): Promise<Overview | null> =>
  deps.storage.readCache<Overview>(cacheKey(project));

type OverviewRequest = { promise: Promise<Overview>; pending: boolean };

const requests = new WeakMap<
  IssueDeps['storage'],
  Map<string, OverviewRequest>
>();

// Open routes reuse the overview; simultaneous refreshes share GitHub's search budget.
export function requestOverview(
  deps: IssueDeps,
  project: Project,
  reload: boolean,
): Promise<Overview> {
  const projects = projectRequests(deps.storage);
  const current = projects.get(project.id);

  if (canReuse(current, reload)) return current.promise;

  const request = startRequest(deps, project, () =>
    projects.delete(project.id),
  );

  projects.set(project.id, request);

  return request.promise;
}

function projectRequests(
  storage: IssueDeps['storage'],
): Map<string, OverviewRequest> {
  const projects = requests.get(storage) ?? new Map<string, OverviewRequest>();
  requests.set(storage, projects);

  return projects;
}

function canReuse(
  current: OverviewRequest | undefined,
  reload: boolean,
): current is OverviewRequest {
  return current !== undefined && (!reload || current.pending);
}

function startRequest(
  deps: IssueDeps,
  project: Project,
  forget: () => void,
): OverviewRequest {
  const request: OverviewRequest = {
    promise: fetchAndCache(deps, project),
    pending: true,
  };

  request.promise = request.promise
    .then((overview) => finishLoading(request, overview))
    .finally(() => finishRequest(request, forget));

  return request;
}

function finishLoading(request: OverviewRequest, overview: Overview): Overview {
  request.pending = false;

  return overview;
}

function finishRequest(request: OverviewRequest, forget: () => void): void {
  if (request.pending) forget();

  request.pending = false;
}

async function fetchAndCache(
  deps: IssueDeps,
  project: Project,
): Promise<Overview> {
  const client = await openClient({ project, ...deps });
  await client.authStatus();

  const overview = await fetchOverview(client);
  await deps.storage.writeCache(cacheKey(project), overview);

  return overview;
}

async function fetchOverview(client: TrackerClient): Promise<Overview> {
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
