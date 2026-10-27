import { expect, it } from 'vitest';
import {
  filterMessage,
  loadingIssues,
  unloaded,
  type ShownIssues,
} from './filter-shown';

const cached: ShownIssues = { issues: [], limit: 30, fetched: false };

const fetched: ShownIssues = { ...cached, fetched: true };

it('says Issues are loading until GitHub answers, even over a cached list', () => {
  expect(filterMessage(unloaded)).toBe(loadingIssues);
  expect(filterMessage(cached)).toBe(loadingIssues);
});

it('says nothing once GitHub has answered', () => {
  expect(filterMessage(fetched)).toBe('');
});

it('says why GitHub failed, over a cached list', () => {
  const message = filterMessage(cached, 'gh is down');

  expect(message).not.toBe(loadingIssues);
  expect(message).toContain('gh is down');
});
