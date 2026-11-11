import type { ListPage } from '@argo/plugin-kit';
import type { Read, Target } from './filter-loader';
import { SignInRequired } from './github-api';
import type { Issue } from './github-issues';
import { unwrap } from './github-reads';
import type { IssueDeps } from './issue-deps';
import type { IssueFilter } from './issue-filters';

// Issues a page loads at a time, and again for each further page.
const pageSize = 30;

/*
 * One page of the filter's Issues, newest first, narrowed by the search. GitHub's search has no cursor, so the
 * cursor is a search qualifier: each further page from the last Issue's creation time on, inclusive so a tie at
 * the boundary is not lost (the kit drops the repeat). A Tracker that does not open lists nothing; the Loader
 * says why.
 */
export async function listFilter(
  source: { deps: IssueDeps; read: Read; target: Promise<Target> },
  query: string,
  cursor: string | null,
): Promise<ListPage<Issue>> {
  const named = await source.target;
  const tracker = await named.opened;

  if (named.state !== 'named' || !tracker.ok) return end;

  return readPage(
    { ...source, projectId: named.project.id },
    searchOf(named.filter, query),
    cursor,
  );
}

const end: ListPage<Issue> = { items: [], cursor: null };

const searchOf = (filter: IssueFilter, query: string): string =>
  query.trim() ? `${filter.search} ${query.trim()}` : filter.search;

type PageSource = { deps: IssueDeps; read: Read; projectId: string };

async function readPage(
  { deps, read, projectId }: PageSource,
  search: string,
  cursor: string | null,
): Promise<ListPage<Issue>> {
  const from = cursor === null ? '' : ` created:<=${cursor}`;
  const full = `${search}${from}`;

  const query = deps.reads.issues({ projectId, search: full, limit: pageSize });
  const items = await readIssues(read, query);

  return { items, cursor: nextCursor(items) };
}

// A full page may have more after it; an Issue without a creation time leaves no cursor to go on from.
const nextCursor = (issues: Issue[]): string | null =>
  issues.length >= pageSize ? lastCreated(issues) : null;

const lastCreated = (issues: Issue[]): string | null =>
  issues.at(-1)?.createdAt ?? null;

// A rejected sign-in is the Loader's to answer, so the list is simply empty.
async function readIssues(
  read: Read,
  query: ReturnType<IssueDeps['reads']['issues']>,
): Promise<Issue[]> {
  try {
    return unwrap(await read(query));
  } catch (cause) {
    if (cause instanceof SignInRequired) return [];

    throw cause;
  }
}
