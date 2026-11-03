import type { ListPage } from '@argo/plugin-kit';
import { pageSize } from './filter-shown';
import type { Issue } from './github-issues';
import type { TrackerClient } from './github-tracker';
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

// What the search field holds, which narrows the filter's Issues.
export type FilterState = { query: string };

export const filterState: FilterState = { query: '' };

// What the Loader read: the Projects, and for the one the path names, its filter and overview.
export type FilterData = {
  projects: Project[];
  project?: Project;
  filter?: IssueFilter;
  overview: Overview | null;
  // Why there are no Issues to show, such as no Tracker chosen yet.
  message: string;
};

type Load = { params: Readonly<Record<string, string>>; state: FilterState };

// What the Loader reads with, and how it says a read it left running has changed the page.
export type LoadDeps = IssueDeps & { changed: () => void };

type Target = { project: Project; filter: IssueFilter };

/*
 * A filter list's Loader (ADR-0050): the Projects, then for the Project and filter the Page path names, the
 * overview and whether its Tracker opens. The Issues are the page's paged list, read by `listFilter`.
 */
export async function loadFilter(
  deps: LoadDeps,
  { params }: Load,
): Promise<FilterData> {
  const projects = await deps.listProjects();
  const { project, filter } = targetOf(projects, params);

  if (!project || !filter)
    return { projects, overview: null, message: 'This page no longer exists.' };

  const [overview, message] = await Promise.all([
    overviewOf(deps, project),
    openMessage(deps, project),
  ]);

  return { projects, project, filter, overview, message };
}

// Why the Project's Tracker does not open, or nothing when it does.
const openMessage = (deps: IssueDeps, project: Project): Promise<string> =>
  openDepsClient({ project, deps }).then(
    () => '',
    (error: Error) => error.message,
  );

/*
 * One page of the filter's Issues, newest first, narrowed by the search. `gh issue list` has no cursor, so the
 * cursor is a search qualifier: each further page from the last Issue's creation time on, inclusive so a tie at
 * the boundary is not lost (the kit drops the repeat). A Tracker that does not open lists nothing; the Loader
 * says why.
 */
export async function listFilter(
  deps: IssueDeps,
  { params, state }: Load,
  cursor: string | null,
): Promise<ListPage<Issue>> {
  const open = await openTarget(deps, params);

  return open
    ? readPage(open.client, searchOf(open.filter, state.query), cursor)
    : end;
}

type OpenTarget = { client: TrackerClient; filter: IssueFilter };

async function openTarget(
  deps: IssueDeps,
  params: Load['params'],
): Promise<OpenTarget | null> {
  const { project, filter } = targetOf(await deps.listProjects(), params);

  if (!project || !filter) return null;

  return openDepsClient({ project, deps }).then(
    (client) => ({ client, filter }),
    () => null,
  );
}

const end: ListPage<Issue> = { items: [], cursor: null };

const searchOf = (filter: IssueFilter, query: string): string =>
  query.trim() ? `${filter.search} ${query.trim()}` : filter.search;

async function readPage(
  client: TrackerClient,
  search: string,
  cursor: string | null,
): Promise<ListPage<Issue>> {
  const from = cursor === null ? '' : ` created:<=${cursor}`;

  const items = await client.listIssues(
    `${search} sort:created-desc${from}`,
    pageSize,
  );

  return { items, cursor: nextCursor(items) };
}

// A full page may have more after it; an Issue without a creation time leaves no cursor to go on from.
const nextCursor = (issues: Issue[]): string | null =>
  issues.length >= pageSize ? lastCreated(issues) : null;

const lastCreated = (issues: Issue[]): string | null =>
  issues.at(-1)?.createdAt ?? null;

const targetOf = (
  projects: Project[],
  params: Load['params'],
): Partial<Target> => ({
  project: projects.find(({ id }) => id === pathText(params.project ?? '')),
  filter: filterById(params.filter ?? ''),
});

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
