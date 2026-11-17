import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { expect, it } from 'vitest';
import type { LinkRead } from './pull-changes';
import type { PullInfo } from './pull-info';
import {
  openReadKeys,
  readOpenOnly,
  type OpenReadKey,
  type OpenReads,
} from './pull-open-reads';
import { openOf } from './pull-record-open';
import type { PullKey } from './pull-store';

const link: PullKey = { projectId: 'project', repository: 'o/r', number: 1 };

const pullOf = (stage: PullInfo['stage']): PullInfo => ({
  repository: 'o/r',
  number: 1,
  title: 'Add the thing',
  stage,
  draft: false,
  conflict: false,
  url: 'https://github.com/o/r/pull/1',
  branch: 'branch',
  base: 'main',
  head: 'abc',
  files: 1,
  additions: 1,
  deletions: 0,
});

const named = <Value>(name: string): NamedQuery<Value> => ({
  api: 'read',
  name,
  args: {},
});

// A source that says which reads it was asked and fails the ones named, answering nothing for the rest.
type Source = Parameters<typeof readOpenOnly>[0];

const sourceOf = (asked: string[], failing: string[] = []): Source => {
  const readState: Argo['queries']['readState'] = (query) => {
    asked.push(query.name);

    return failing.includes(query.name)
      ? Promise.reject(new Error(`${query.name} broke`))
      : Promise.resolve({ stale: false });
  };

  return {
    reads: {
      autoMerge: () => named('autoMerge'),
      mergeSettings: () => named('settings'),
      comments: () => named('comments'),
      viewer: () => named('viewer'),
    },
    readState,
  };
};

const sorted = (names: string[]): string[] => names.toSorted();

const askedOf = async (stage: PullInfo['stage']): Promise<string[]> => {
  const asked: string[] = [];

  await readOpenOnly(sourceOf(asked), link, pullOf(stage));

  return sorted(asked);
};

it('reads every entry of the table for an Open pull request', async () => {
  expect(await askedOf('open')).toEqual(sorted(openReadKeys));
});

it('reads none of them for a Merged or Closed one', async () => {
  expect(await askedOf('merged')).toEqual([]);
  expect(await askedOf('closed')).toEqual([]);
});

const failureOf = async (key: OpenReadKey): Promise<LinkRead<PullKey>> => ({
  link,
  pull: { data: pullOf('open') },
  ...(await readOpenOnly(sourceOf([], [key]), link, pullOf('open'))),
});

const neighboursOf = (key: OpenReadKey): OpenReadKey[] =>
  openReadKeys.filter((one) => one !== key);

it.each(openReadKeys)(
  'leaves its neighbours intact when the %s read fails',
  async (key) => {
    const read = await failureOf(key);

    expect(read[key]?.failure?.message).toBe(`${key} broke`);
    expect(neighboursOf(key).map((one) => read[one])).toEqual(
      neighboursOf(key).map(() => ({})),
    );
  },
);

const failure = { reason: 'failed', message: 'x' } as const;

const before: LinkRead<PullKey> = {
  link,
  pull: { data: pullOf('open') },
  autoMerge: { data: { on: true, nodeId: 'node' } },
  settings: { data: { allowed: true, methods: ['SQUASH'] } },
  comments: { data: [{ id: 1, path: 'a', body: 'b', trusted: true }] },
  viewer: { data: 'me' },
};

const dataOf = (read: OpenReads): unknown[] =>
  openReadKeys.map((key) => read[key]?.data);

it('keeps the last good answer of every entry beside a failure', () => {
  const read: LinkRead<PullKey> = {
    link,
    pull: { data: pullOf('open') },
    autoMerge: { failure },
    settings: { failure },
    comments: { failure },
    viewer: { failure },
  };

  const kept = openOf(before, read);

  expect(dataOf(kept)).toEqual(dataOf(before));
  expect(openReadKeys.map((key) => kept[key]?.failure)).toEqual(
    openReadKeys.map(() => failure),
  );
});

it('keeps what stood when the pull read failed outright', () => {
  const kept = openOf(before, { link, pull: { failure } });

  expect(dataOf(kept)).toEqual(dataOf(before));
});

it('keeps nothing once the pull request has ended', () => {
  expect(openOf(before, { link, pull: { data: pullOf('merged') } })).toEqual(
    {},
  );
});
