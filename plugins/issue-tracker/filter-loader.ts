import { readPages } from './filter-paging';
import type { Issue } from './github-issues';
import { openDepsClient, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { filterById, type IssueFilter } from './issue-filters';
import { pathText } from './issue-paths';
import {
  knownOverview,
  readOverview,
  requestOverview,
  type Overview,
} from './overview-requests';

// How many pages of Issues the list shows.
export type FilterState = { pages: number };

export const filterState: FilterState = { pages: 1 };

// What the Loader read: the Projects, and for the one the path names, its overview and the filter's Issues.
export type FilterData = {
  projects: Project[];
  project?: Project;
  filter?: IssueFilter;
  overview: Overview | null;
  issues: Issue[];
  // Why there are no Issues to show, such as no Tracker chosen yet.
  message: string;
  pages: number;
  // Whether GitHub has Issues past the last page shown.
  hasMore: boolean;
};

type Load = { params: Readonly<Record<string, string>>; state: FilterState };

// What the Loader reads with, and how it says a read it left running has changed the page.
export type LoadDeps = IssueDeps & { changed: () => void };

type Target = { project: Project; filter: IssueFilter };

type Reads = Pick<FilterData, 'overview' | 'issues' | 'message' | 'hasMore'>;

/*
 * A filter list's Loader (ADR-0050): the Projects, then for the Project and filter the Page path names,
 * the overview and the Page state's pages of Issues, read at once.
 */
export async function loadFilter(
  deps: LoadDeps,
  { params, state }: Load,
): Promise<FilterData> {
  const projects = await deps.listProjects();
  const { project, filter } = targetOf(projects, params);

  const reads =
    project && filter
      ? await targetReads(deps, { project, filter }, state.pages)
      : missing;

  return { projects, project, filter, pages: state.pages, ...reads };
}

const missing = {
  overview: null,
  issues: [],
  hasMore: false,
  message: 'This page no longer exists.',
};

const targetOf = (
  projects: Project[],
  params: Load['params'],
): Partial<Target> => ({
  project: projects.find(({ id }) => id === pathText(params.project ?? '')),
  filter: filterById(params.filter ?? ''),
});

async function targetReads(
  deps: LoadDeps,
  target: Target,
  pages: number,
): Promise<Reads> {
  const [overview, issues] = await Promise.all([
    overviewOf(deps, target.project),
    issuesOf(deps, target, pages),
  ]);

  return { overview, ...issues };
}

/*
 * The overview this Plugin read or is reading, so a page drawn after a status change waits for the new
 * counts. Before the first read, the stored overview draws at once and GitHub's is read behind it; the
 * page draws again when it lands, as the overview page always has.
 */
async function overviewOf(
  deps: LoadDeps,
  project: Project,
): Promise<Overview | null> {
  const known = knownOverview(deps, project);

  if (known) return known.catch(() => null);

  return storedOverview(deps, project);
}

async function storedOverview(
  deps: LoadDeps,
  project: Project,
): Promise<Overview | null> {
  const stored = await readOverview(deps, project);
  const read = requestOverview(deps, project, false);

  if (!stored) return read.catch(() => null);

  void read.then(deps.changed, () => null);

  return stored;
}

async function issuesOf(
  deps: IssueDeps,
  { project, filter }: Target,
  pages: number,
): Promise<Omit<Reads, 'overview'>> {
  const scope = { project: project.id, search: filter.search };

  return openDepsClient({ project, deps })
    .then(async (client) => ({
      ...(await readPages(client, scope, pages)),
      message: '',
    }))
    .catch(failedRead);
}

const failedRead = (error: Error): Omit<Reads, 'overview'> => ({
  issues: [],
  hasMore: false,
  message: error.message,
});
