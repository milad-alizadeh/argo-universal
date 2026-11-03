import { expect, it } from 'vitest';
import { forgetPages, readPages } from './filter-paging';
import { pageSize } from './filter-shown';
import type { Issue } from './github-issues';
import type { TrackerClient } from './github-tracker';

// Issues 1..count, newest first, one minute apart; the fake gh answers `created:<=` as GitHub does.
type Fake = { client: TrackerClient; searches: string[] };

function tracker(count: number): Fake {
  const searches: string[] = [];

  const issues = Array.from({ length: count }, (_, index) =>
    issueOf(count - index),
  );

  const listIssues = async (
    search: string,
    limit: number,
  ): Promise<Issue[]> => {
    searches.push(search);

    const until = /created:<=(\S+)/u.exec(search)?.[1];

    return issues
      .filter(
        (issue) => until === undefined || String(issue.createdAt) <= until,
      )
      .slice(0, limit);
  };

  return { client: { ...unused, listIssues }, searches };
}

const refuse = (): Promise<never> =>
  Promise.reject(new Error('Not read by paging'));

const unused: TrackerClient = {
  authStatus: refuse,
  listIssues: refuse,
  countIssues: refuse,
  listLabels: refuse,
  getIssue: refuse,
  setStatus: refuse,
};

const issueOf = (number: number): Issue => ({
  number,
  title: `Issue ${number}`,
  status: 'open',
  body: '',
  url: '',
  labels: [],
  assignees: [],
  createdAt: new Date(Date.UTC(2026, 0, 1, 0, number)).toISOString(),
});

const scope = { project: 'p', search: 'is:open' };

it('reads one page more for each further page, joining them without the repeat at the boundary', async () => {
  forgetPages();
  const { client, searches } = tracker(pageSize * 3);

  const two = await readPages(client, scope, 2);

  expect(two.issues).toHaveLength(pageSize * 2 - 1);
  expect(two.hasMore).toBe(true);
  expect(searches).toHaveLength(2);

  searches.length = 0;
  const three = await readPages(client, scope, 3);

  // The first page is read again; the second comes from what was kept; only the third is new.
  expect(searches).toHaveLength(2);
  expect(searches[1]).toContain('created:<=');
  expect(three.issues.map(({ number }) => number)).toEqual([
    ...new Set(three.issues.map(({ number }) => number)),
  ]);
});

it('has no more once a page comes back short', async () => {
  forgetPages();
  const { client } = tracker(pageSize - 1);

  expect((await readPages(client, scope, 1)).hasMore).toBe(false);
});
