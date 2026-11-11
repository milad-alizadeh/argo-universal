import type { LoaderInput } from '@argo/plugin-kit';
import { answered } from './github-reads';
import type { TrackerClient } from './github-tracker';
import { openDepsClient, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { filterById, type IssueFilter } from './issue-filters';
import { pathText } from './issue-paths';
import type { Overview } from './overview';

// What the search field holds, which narrows the filter's Issues.
export type FilterState = { query: string };

export const filterState: FilterState = { query: '' };

// The Project and filter the Page path names, and the Project's overview when it could be read.
type Chosen = {
  project: Project;
  filter: IssueFilter;
  overview: Overview | null;
};

/*
 * What the Loader read: the Projects, and for the page the path names either nothing (`gone`), or its Project
 * and filter with the Tracker opened, or with why it did not open, such as no Tracker chosen yet.
 */
export type FilterData = { projects: Project[] } & (
  | { state: 'gone' }
  | ({ state: 'unopened'; message: string } & Chosen)
  | ({ state: 'opened' } & Chosen)
);

type Load = Pick<LoaderInput<FilterState>, 'params' | 'state'>;

// How the Loader reads a Query through Argo.
export type Read = LoaderInput<FilterState>['read'];

// The Projects, and either nothing the Page path names, or its Project and filter with the Tracker opened or why it does not open.
export type Target = { projects: Project[]; opened: Promise<Opened> } & (
  | { state: 'gone' }
  | { state: 'named'; project: Project; filter: IssueFilter }
);

// Either the Tracker's client, or why it did not open.
type Opened =
  | { ok: true; client: TrackerClient }
  | { ok: false; message: string };

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
  const id = pathText(params.project ?? '');

  return named(deps, projects, {
    project: projects.find((found) => found.id === id),
    filter: filterById(params.filter ?? ''),
  });
}

// The Target a path names, or a gone one when it names no Project or no filter.
function named(
  deps: IssueDeps,
  projects: Project[],
  { project, filter }: Named,
): Target {
  if (!project || !filter)
    return { projects, state: 'gone', opened: goneOpen() };

  return {
    projects,
    state: 'named',
    project,
    filter,
    opened: openedClient(deps, project),
  };
}

type Named = {
  project: Project | undefined;
  filter: ReturnType<typeof filterById>;
};

const goneOpen = (): Promise<Opened> => Promise.resolve(gone);

const gone = { ok: false, message: 'This page no longer exists.' } as const;

// Settled either way, so a draw that only loads leaves no failed open unread.
const openedClient = (deps: IssueDeps, project: Project): Promise<Opened> =>
  openDepsClient({ project, deps }).then(
    (client): Opened => ({ ok: true, client }),
    (cause: unknown): Opened => ({
      ok: false,
      message: String(Object(cause).message),
    }),
  );

/*
 * A filter list's Loader (ADR-0050): the Projects, then for the Project and filter the Page path names, the
 * overview and whether its Tracker opens. The Issues are the page's paged list, read by `listFilter`.
 */
export async function loadFilter(
  deps: IssueDeps,
  read: Read,
  target: Promise<Target>,
): Promise<FilterData> {
  const named = await target;
  const { projects } = named;

  if (named.state === 'gone') return { projects, state: 'gone' };

  const { project, filter } = named;

  const [overview, tracker] = await Promise.all([
    overviewOf(deps, read, project),
    named.opened,
  ]);

  return withTracker({ projects, project, filter, overview }, tracker);
}

// The overview when it could be read; a rejected sign-in is the page's to answer, any other failure leaves none.
const overviewOf = async (
  deps: IssueDeps,
  read: Read,
  project: Project,
): Promise<Overview | null> =>
  (await answered(read(deps.reads.overview({ projectId: project.id })))).value;

const withTracker = (
  chosen: { projects: Project[] } & Chosen,
  tracker: Opened,
): FilterData =>
  tracker.ok
    ? { ...chosen, state: 'opened' }
    : { ...chosen, state: 'unopened', message: tracker.message };

// Why there are no Issues to show; none when the Tracker opened.
export function noIssuesBecause(data: FilterData): string {
  if (data.state === 'gone') return gone.message;

  return data.state === 'unopened' ? data.message : '';
}
