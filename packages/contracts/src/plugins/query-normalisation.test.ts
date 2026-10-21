import { expect, it } from 'vitest';
import { PluginQuery } from './argo-calls';
import { serialisePluginQuery } from './query-normalisation';

const issues = 'https://example.com/issues';

const token = { authorization: 'Bearer t' };

const key = (query: PluginQuery): string => serialisePluginQuery(query);

it('keys a fetch Query whose optional fields are left undefined as one that omits them', () => {
  expect(
    key({ api: 'fetch', url: issues, headers: undefined, body: undefined }),
  ).toBe(key({ api: 'fetch', url: issues }));
});

it('keys a process Query whose optional fields are left undefined as one that omits them', () => {
  expect(
    key({
      api: 'process',
      action: 'run',
      argv: ['gh', 'pr', 'list'],
      cwd: undefined,
    }),
  ).toBe(key({ api: 'process', action: 'run', argv: ['gh', 'pr', 'list'] }));
});

it('keys header names that differ only in case as the same Query', () => {
  expect(
    key({ api: 'fetch', url: issues, headers: { Authorization: 'Bearer t' } }),
  ).toBe(key({ api: 'fetch', url: issues, headers: token }));
});

it('keys the same Query written in another field order alike', () => {
  expect(key({ api: 'fetch', url: issues, method: 'GET' })).toBe(
    key({ method: 'GET', api: 'fetch', url: issues }),
  );
});

it('refuses a Query that names one header more than once', () => {
  expect(() =>
    key({
      api: 'fetch',
      url: issues,
      headers: {
        'Content-Type': 'application/json',
        'content-type': 'text/plain',
      },
    }),
  ).toThrow('names the content-type header more than once');
});

it('keeps a Query that names one header once apart from a Query that drops it', () => {
  expect(key({ api: 'fetch', url: issues, headers: token })).not.toBe(
    key({ api: 'fetch', url: issues }),
  );
});

// The kit sends its normal form as the Query, and the Engine keys the entry by serialising that again.
it('keys a Query it has already normalised as it keys the one a Plugin wrote', () => {
  const written: PluginQuery = {
    api: 'fetch',
    url: issues,
    headers: { Authorization: 'Bearer t' },
    body: undefined,
  };

  expect(key(PluginQuery.parse(JSON.parse(key(written))))).toBe(key(written));
});
