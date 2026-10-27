import { expect, it } from 'vitest';
import { filterMessage, unloaded, type Shown } from './filter-shown';

const loading = 'Loading Issues…';

const cached: Shown = { issues: [], limit: 30, fetched: false };

const fetched: Shown = { ...cached, fetched: true };

it('says Issues are loading until GitHub answers, even over a cached list', () => {
  expect(filterMessage(unloaded)).toBe(loading);
  expect(filterMessage(cached)).toBe(loading);
});

it('says nothing once GitHub has answered', () => {
  expect(filterMessage(fetched)).toBe('');
});

it('says why GitHub failed, over a cached list', () => {
  const message = filterMessage(cached, 'gh is down');

  expect(message).not.toBe(loading);
  expect(message).toContain('gh is down');
});
