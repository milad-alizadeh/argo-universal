import { pageSize } from './filter-shown';
import type { Issue } from './github-issues';
import { openDepsClient, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { filterById, type IssueFilter } from './issue-filters';
import { pathText } from './issue-paths';
import {
  readOverview,
  requestOverview,
  type Overview,
} from './overview-requests';

export type FilterState = { limit: number };

export const filterState: FilterState = { limit: pageSize };

// What the Loader read: the Projects, and for the one the path names, its overview and the filter's Issues.
export type FilterData = {
  projects: Project[];
  project?: Project;
  filter?: IssueFilter;
  overview: Overview | null;
  issues: Issue[];
  // Why there are no Issues to show, such as no Tracker chosen yet.
  message: string;
  limit: number;
};

type Load = { params: Readonly<Record<string, string>>; state: FilterState };

type Target = { project: Project; filter: IssueFilter };

/*
 * A filter list's Loader (ADR-0050): the Projects, then for the Project and filter the Page path names,
 * the overview and up to the Page state's limit of Issues, read at once.
 */
export async function loadFilter(
  deps: IssueDeps,
  { params, state }: Load,
): Promise<FilterData> {
  const projects = await deps.listProjects();
  const { project, filter } = targetOf(projects, params);

  const reads =
    project && filter
      ? await targetReads(deps, { project, filter }, state.limit)
      : missing;

  return { projects, project, filter, limit: state.limit, ...reads };
}

const missing = {
  overview: null,
  issues: [],
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
  deps: IssueDeps,
  target: Target,
  limit: number,
): Promise<Pick<FilterData, 'overview' | 'issues' | 'message'>> {
  const [overview, issues] = await Promise.all([
    overviewOf(deps, target.project),
    issuesOf(deps, target, limit),
  ]);

  return { overview, ...issues };
}

// The cached overview when there is one, as a filter page has always shown it; GitHub's otherwise.
async function overviewOf(
  deps: IssueDeps,
  project: Project,
): Promise<Overview | null> {
  const cached = await readOverview(deps, project);

  return cached ?? requestOverview(deps, project, false).catch(() => null);
}

// `gh issue list` has no cursor, so a further page is a longer list.
async function issuesOf(
  deps: IssueDeps,
  { project, filter }: Target,
  limit: number,
): Promise<Pick<FilterData, 'issues' | 'message'>> {
  return openDepsClient({ project, deps })
    .then(async (client) => ({
      issues: await client.listIssues(filter.search, limit),
      message: '',
    }))
    .catch((error: Error) => ({ issues: [], message: error.message }));
}
