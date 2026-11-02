import { expect, it } from 'vitest';
import { filterMessage, loadingIssues } from './filter-shown';

it('says Issues are loading until GitHub answers', () => {
  expect(filterMessage({ kind: 'loading' })).toBe(loadingIssues);
});

it('says nothing once GitHub has answered', () => {
  expect(filterMessage({ kind: 'ok', value: [] })).toBe('');
});

it('says why GitHub failed', () => {
  const message = filterMessage({ kind: 'failed', message: 'GitHub is down' });

  expect(message).not.toBe(loadingIssues);
  expect(message).toContain('GitHub is down');
});
