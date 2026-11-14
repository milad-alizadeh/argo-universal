import { expect, it } from 'vitest';
import {
  SlotItemsInput,
  itemsSlot,
  sessionChangesSlotId,
} from '../plugins/wire';
import { Change } from './change';

const pullRequest = {
  id: 'github:owner/repository#12',
  stage: 'open',
  title: 'Add the thing',
  provider: 'github',
  repository: 'owner/repository',
  branch: 'feature/thing',
  head: '0123456789abcdef0123456789abcdef01234567',
  base: 'main',
  pullRequest: {
    number: 12,
    url: 'https://github.com/owner/repository/pull/12',
  },
  draft: true,
  conflict: true,
  totals: { files: 3, additions: 10, deletions: 2 },
};

it('accepts a PR-backed Change with draft and conflict both set', () => {
  expect(Change.parse(pullRequest)).toEqual(pullRequest);
});

it("accepts the head repository and the mark of the Checkout's own line of work, and only as true", () => {
  const marked = {
    ...pullRequest,
    headRepository: 'fork-owner/repository',
    onCheckout: true,
  };

  expect(Change.parse(marked)).toEqual(marked);
  expect(Change.safeParse({ ...marked, onCheckout: false }).success).toBe(
    false,
  );
});

it.each(['working', 'branch'])(
  'accepts a %s Change with no PR number, repository or provider',
  (stage) => {
    const change = { id: `local:${stage}`, stage, title: 'Uncommitted work' };

    expect(Change.parse(change)).toEqual(change);
  },
);

it.each([
  [
    'a PR number without a repository',
    { ...pullRequest, repository: undefined },
  ],
  [
    'a PR number below one',
    {
      ...pullRequest,
      pullRequest: { number: 0, url: 'https://github.com/o/r/pull/0' },
    },
  ],
  [
    'a non-https URL',
    { ...pullRequest, pullRequest: { number: 1, url: 'javascript:alert(1)' } },
  ],
  ['an unknown stage', { ...pullRequest, stage: 'abandoned' }],
  ['an unknown field', { ...pullRequest, checks: 'passing' }],
  ['an empty title', { ...pullRequest, title: ' ' }],
])('refuses a Change with %s', (_name, change) => {
  expect(Change.safeParse(change).success).toBe(false);
});

it('asks the Session changes Slot for a Session list and answers Changes keyed by Session id', () => {
  const input = {
    slotId: sessionChangesSlotId,
    contexts: [{ sessionId: 'session', projectId: 'argo' }],
  };

  const slot = itemsSlot(sessionChangesSlotId);

  expect(SlotItemsInput.parse(input)).toEqual(input);
  expect(slot?.content.key).toBe('sessionId');
  expect(
    slot?.merged.safeParse({
      items: [{ pluginId: 'github', item: pullRequest }],
      overflow: [],
    }).success,
  ).toBe(true);
});
