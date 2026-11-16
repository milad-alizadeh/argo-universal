import { expect, it } from 'vitest';
import { startJira } from './mocks/journey';
import {
  addIssues,
  argoIssues,
  filterChoice,
  hasMore,
  lastCursor,
  lastJql,
  searchCount,
  shownKeys,
} from './mocks/listing';

const timeoutMs = 30_000;

// Jira answers this many issues a page.
const pageSize = 50;

it(
  'loads more a page at a time from Jira’s cursor, until the last',
  async () => {
    const jira = await startJira();

    // 120 issues in all: two full pages, then 20.
    addIssues(jira, 117);

    const page = await argoIssues(jira);

    expect(shownKeys(page)).toHaveLength(pageSize);
    expect(lastCursor(jira)).toBeNull();
    expect(hasMore(page)).toBe(true);

    await page.loadMore();

    expect(shownKeys(page)).toHaveLength(2 * pageSize);
    expect(lastCursor(jira)).toBe('50');

    const before = searchCount(jira);

    await page.loadMore();

    // Only the page it lacked was read.
    expect(searchCount(jira)).toBe(before + 1);
    expect(shownKeys(page)).toHaveLength(120);
    expect(shownKeys(page).at(-1)).toBe('ARGO-216');
    expect(hasMore(page)).toBe(false);
  },
  timeoutMs,
);

it(
  'loads more of a filtered list, paging through what the filters leave',
  async () => {
    const jira = await startJira();

    addIssues(jira, 60);

    const page = await argoIssues(jira);

    await page.press(filterChoice('To Do'));

    expect(shownKeys(page)).toHaveLength(pageSize);

    await page.loadMore();

    // The 60 added, and ARGO-1.
    expect(shownKeys(page)).toHaveLength(61);
    expect(lastJql(jira)).toContain('statusCategory = "To Do"');
    expect(hasMore(page)).toBe(false);
  },
  timeoutMs,
);
