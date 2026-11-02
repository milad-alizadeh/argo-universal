import type { GitHubRead } from './github-api';

// Issues a page loads at a time, and again for each further page.
export const pageSize = 30;

export const loadingIssues = 'Loading Issues…';

// "Loading Issues…" lasts until GitHub answers, so a list not yet fetched never reads "No Issues.".
export function filterMessage(read: GitHubRead<unknown>): string {
  if (read.kind === 'ok') return '';

  return read.kind === 'failed' ? read.message : loadingIssues;
}
