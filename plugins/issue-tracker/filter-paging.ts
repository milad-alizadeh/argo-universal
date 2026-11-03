import { pageSize } from './filter-shown';
import type { Issue } from './github-issues';
import type { TrackerClient } from './github-tracker';

// One page of a filter's Issues, newest first, and the cursor of the page after it when there is one.
type Page = { issues: Issue[]; next: string | null };

type Kept = { page: Page; at: number };

// Pages are kept this long, so a further page costs one read however many came before.
const keptMs = 60_000;

const kept = new Map<string, Kept>();

// A write makes every page kept before it stale; their cursors still say where the pages start.
let writtenAt = 0;

export type Paged = { issues: Issue[]; hasMore: boolean };

/*
 * `gh issue list` has no cursor, so the cursor is a search qualifier: newest first, and each further page
 * from the last Issue's creation time on (inclusive, so a tie at the boundary is not lost; the repeat is
 * dropped). One page is a pull, so it is read again. More pages come from what was kept; the stale ones
 * among them are read at once from their known cursors, and only the page after them waits on a cursor.
 */
export async function readPages(
  client: TrackerClient,
  scope: Scope,
  pages: number,
): Promise<Paged> {
  const source = { client, scope, pages };

  const known = await Promise.all(
    knownCursors(source, [null], null).map((cursor) => pageAt(source, cursor)),
  );

  return joined(await further(source, known));
}

type Source = { client: TrackerClient; scope: Scope; pages: number };

const pageAt = (
  { client, scope, pages }: Source,
  cursor: string | null,
): Promise<Page> =>
  pages > 1
    ? keptPage(client, scope, cursor)
    : freshPage(client, scope, cursor);

// An Operation that changed an Issue makes every kept page stale.
export function forgetPages(): void {
  writtenAt = Date.now() + 1;
}

// The first page's cursor, then each kept page's next one, as far as the pages asked for.
function knownCursors(
  source: Source,
  cursors: (string | null)[],
  last: string | null,
): (string | null)[] {
  const next = nextOf(source.scope, last);

  if (next === null || cursors.length >= source.pages) return cursors;

  return knownCursors(source, [...cursors, next], next);
}

const nextOf = (scope: Scope, cursor: string | null): string | null =>
  kept.get(keyOf(scope, cursor))?.page.next ?? null;

// Pages past the known ones wait on the one before for their cursor.
async function further(source: Source, read: Page[]): Promise<Page[]> {
  const next = lastNext(read);

  if (next === null || read.length >= source.pages) return read;

  const page = await keptPage(source.client, source.scope, next);

  return further(source, [...read, page]);
}

const lastNext = (read: Page[]): string | null => read.at(-1)?.next ?? null;

const joined = (read: Page[]): Paged => ({
  issues: once(read.flatMap((page) => page.issues)),
  hasMore: lastNext(read) !== null,
});

type Scope = { project: string; search: string };

async function keptPage(
  client: TrackerClient,
  scope: Scope,
  cursor: string | null,
): Promise<Page> {
  const hit = kept.get(keyOf(scope, cursor));

  if (hit && fresh(hit)) return hit.page;

  return freshPage(client, scope, cursor);
}

const fresh = ({ at }: Kept): boolean =>
  at >= writtenAt && Date.now() - at < keptMs;

const keyOf = (scope: Scope, cursor: string | null): string =>
  `${scope.project}\n${scope.search}\n${cursor ?? ''}`;

// A page is as old as its read's start, so a read a write overtook is stale when it lands.
async function freshPage(
  client: TrackerClient,
  scope: Scope,
  cursor: string | null,
): Promise<Page> {
  const at = Date.now();
  const page = await readPage(client, scope.search, cursor);

  kept.set(keyOf(scope, cursor), { page, at });

  return page;
}

async function readPage(
  client: TrackerClient,
  search: string,
  cursor: string | null,
): Promise<Page> {
  const from = cursor === null ? '' : ` created:<=${cursor}`;

  const issues = await client.listIssues(
    `${search} sort:created-desc${from}`,
    pageSize,
  );

  return { issues, next: nextCursor(issues) };
}

// A full page may have more after it; an Issue without a creation time leaves no cursor to go on from.
const nextCursor = (issues: Issue[]): string | null =>
  issues.length >= pageSize ? lastCreated(issues) : null;

const lastCreated = (issues: Issue[]): string | null =>
  issues.at(-1)?.createdAt ?? null;

const once = (issues: Issue[]): Issue[] => [
  ...new Map(issues.map((issue) => [issue.number, issue])).values(),
];
