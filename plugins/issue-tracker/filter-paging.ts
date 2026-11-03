import { pageSize } from './filter-shown';
import type { Issue } from './github-issues';
import type { TrackerClient } from './github-tracker';

// One page of a filter's Issues, newest first, and the cursor of the page after it when there is one.
type Page = { issues: Issue[]; next: string | null };

type Kept = { page: Page; at: number };

// Pages are kept this long, so a further page costs one read however many came before.
const keptMs = 60_000;

const kept = new Map<string, Kept>();

export type Paged = { issues: Issue[]; hasMore: boolean };

/*
 * `gh issue list` has no cursor, so the cursor is a search qualifier: newest first, and each further page
 * from the last Issue's creation time on (inclusive, so a tie at the boundary is not lost; the repeat is
 * dropped). One page is a pull, so it is read again; more pages come from what was kept when they can.
 */
export async function readPages(
  client: TrackerClient,
  scope: Scope,
  pages: number,
): Promise<Paged> {
  let page = await firstPage(client, scope, pages);
  const issues = [...page.issues];

  for (let read = 1; read < pages && page.next !== null; read++) {
    page = await keptPage(client, scope, page.next);
    issues.push(...page.issues);
  }

  return { issues: once(issues), hasMore: page.next !== null };
}

// An Operation that changed an Issue makes every kept page stale.
export function forgetPages(): void {
  kept.clear();
}

type Scope = { project: string; search: string };

const firstPage = (
  client: TrackerClient,
  scope: Scope,
  pages: number,
): Promise<Page> =>
  pages > 1 ? keptPage(client, scope, null) : freshPage(client, scope, null);

async function keptPage(
  client: TrackerClient,
  scope: Scope,
  cursor: string | null,
): Promise<Page> {
  const hit = kept.get(keyOf(scope, cursor));

  if (hit && Date.now() - hit.at < keptMs) return hit.page;

  return freshPage(client, scope, cursor);
}

const keyOf = (scope: Scope, cursor: string | null): string =>
  `${scope.project}\n${scope.search}\n${cursor ?? ''}`;

async function freshPage(
  client: TrackerClient,
  scope: Scope,
  cursor: string | null,
): Promise<Page> {
  const page = await readPage(client, scope.search, cursor);

  kept.set(keyOf(scope, cursor), { page, at: Date.now() });

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
