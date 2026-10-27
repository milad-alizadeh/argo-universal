import { githubError } from './github-errors';
import type { Issue } from './github-issues';

// `fetched` is false for the cached first page, until GitHub has answered.
export type Shown = { issues: Issue[]; limit: number; fetched: boolean };

// Issues a page loads at a time, and again for each further page.
export const pageSize = 30;

export const unloaded: Shown = { issues: [], limit: pageSize, fetched: false };

const loading = 'Loading Issues…';

// "Loading Issues…" lasts until GitHub answers, so a cached empty list never reads "No Issues.".
export function filterMessage(shown: Shown, error?: string): string {
  return error === undefined ? loadingMessage(shown) : githubError(error);
}

const loadingMessage = (shown: Shown): string => (shown.fetched ? '' : loading);
