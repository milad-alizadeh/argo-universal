import { pageSize } from './filter-shown';
import type { Issue } from './github-issues';
import type { TrackerClient } from './github-tracker';

// One page of a filter's Issues, newest first, and the cursor of the page after it when there is one.
type Page = { issues: Issue[]; next: string | null };

type Kept = { page: Page; at: number };

// Pages after the first are kept this long, so a further page costs one read however many came before.
const keptMs = 60_000;

const kept = new Map<string, Kept>();

export type Paged = { issues: Issue[]; hasMore: boolean };

/*
 * `gh issue list` has no cursor, so the cursor is a search qualifier: newest first, and each further page
 * from the last Issue's creation time on (inclusive, so a tie at the boundary is not lost; the repeat is
 * dropped). The first page is always read; the ones after it come from what was kept when they can.
 */
export async function readPages(
  client: TrackerClient,
  scope: { project: string; search: string },
  pages: number,
): Promise<Paged> {
  let page = await readPage(client, scope.search, null);
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

async function keptPage(
  client: TrackerClient,
  scope: { project: string; search: string },
  cursor: string,
): Promise<Page> {
  const key = `${scope.project}\n${scope.search}\n${cursor}`;
  const hit = kept.get(key);

  if (hit && Date.now() - hit.at < keptMs) return hit.page;

  const page = await readPage(client, scope.search, cursor);

  kept.set(key, { page, at: Date.now() });

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
