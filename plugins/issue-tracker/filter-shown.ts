import type { Issue } from './github-issues';

// `fetched` is false for the cached first page, until GitHub has answered.
export type ShownIssues = { issues: Issue[]; limit: number; fetched: boolean };

// Issues a page loads at a time, and again for each further page.
export const pageSize = 30;

export const unloaded: ShownIssues = {
  issues: [],
  limit: pageSize,
  fetched: false,
};

export const loadingIssues = 'Loading Issues…';

// "Loading Issues…" lasts until GitHub answers, so a cached empty list never reads "No Issues.".
export function filterMessage(shown: ShownIssues, error?: string): string {
  return error === undefined ? loadingMessage(shown) : error;
}

const loadingMessage = (shown: ShownIssues): string =>
  shown.fetched ? '' : loadingIssues;
