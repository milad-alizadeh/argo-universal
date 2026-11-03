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

// The Projects, and the Project and filter the Page path names with its Tracker opened, or why it does not open.
type Target = {
  projects: Project[];
  project?: Project;
  filter?: IssueFilter;
  opened: Promise<Opened>;
};

type Opened = { client?: TrackerClient; message: string };

/*
 * One draw's Loader and paged list ask for its target at once, with the same input: it is worked out once
 * per draw, and neither waits on the other.
 */
export function filterTargets(
  deps: IssueDeps,
): (input: Load) => Promise<Target> {
  const targets = new WeakMap<Load, Promise<Target>>();

  return (input) => {
    const target = targets.get(input) ?? targetOf(deps, input.params);

    targets.set(input, target);

    return target;
  };
}

async function targetOf(
  deps: IssueDeps,
  params: Load['params'],
): Promise<Target> {
  const projects = await deps.listProjects();
  const { project, filter } = namedBy(projects, params);

  const opened =
    project && filter ? openedClient(deps, project) : Promise.resolve(gone);

  return { projects, project, filter, opened };
}

const namedBy = (
  projects: Project[],
  params: Load['params'],
): Pick<Target, 'project' | 'filter'> => ({
  project: projects.find(({ id }) => id === pathText(params.project ?? '')),
  filter: filterById(params.filter ?? ''),
});

const gone: Opened = { message: 'This page no longer exists.' };

// Settled either way, so a draw that only loads leaves no failed open unread.
const openedClient = (deps: IssueDeps, project: Project): Promise<Opened> =>
  openDepsClient({ project, deps }).then(
    (client) => ({ client, message: '' }),
    (error: Error) => ({ message: error.message }),
  );

/*
 * A filter list's Loader (ADR-0050): the Projects, then for the Project and filter the Page path names, the
 * overview and whether its Tracker opens. The Issues are the page's paged list, read by `listFilter`.
 */
export async function loadFilter(
  deps: LoadDeps,
  target: Promise<Target>,
): Promise<FilterData> {
  const { projects, project, filter, opened } = await target;

  if (!project || !filter)
    return { projects, overview: null, message: gone.message };

  const [overview, { message }] = await Promise.all([
    overviewOf(deps, project),
    opened,
  ]);

  return { projects, project, filter, overview, message };
}

/*
 * One page of the filter's Issues, newest first, narrowed by the search. `gh issue list` has no cursor, so the
 * cursor is a search qualifier: each further page from the last Issue's creation time on, inclusive so a tie at
 * the boundary is not lost (the kit drops the repeat). A Tracker that does not open lists nothing; the Loader
 * says why.
 */
export async function listFilter(
  target: Promise<Target>,
  query: string,
  cursor: string | null,
): Promise<ListPage<Issue>> {
  const { filter, opened } = await target;
  const { client } = await opened;

  return filter && client
    ? readPage(client, searchOf(filter, query), cursor)
    : end;
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
