import type { Change } from '@repo/contracts';
import { iconSymbols } from '@repo/kit/symbols/icon-names';
import { describe, expect, it } from 'vitest';
import { sessionPullRequests } from './session-pull-requests';
import type { ReadItem, SlotReading } from './slot-items';

const ownedId = 'github:owner/repository#12';

const owned = 'owner/repository';

const pullRequest = {
  number: 12,
  url: 'https://github.com/owner/repository/pull/12',
};

const open: Change = {
  id: ownedId,
  stage: 'open',
  title: 'Add the thing',
  repository: owned,
  pullRequest,
  totals: { files: 3, additions: 10, deletions: 2 },
};

const read = (item: Change): ReadItem<Change> => ({
  pluginId: 'github',
  pluginName: 'GitHub',
  pluginIcon: iconSymbols.plug,
  item,
});

const reading = (...items: Change[]): SlotReading<Change> => ({
  items: items.map(read),
  overflow: [],
  owner: undefined,
});

describe('sessionPullRequests', () => {
  it('draws a PR-backed Change with its number, title, stage and totals', () => {
    expect(sessionPullRequests(reading(open))).toEqual([
      {
        id: ownedId,
        stage: 'open',
        number: 12,
        title: 'Add the thing',
        url: pullRequest.url,
        summary: { files: 3, additions: 10, deletions: 2 },
        mergeable: true,
      },
    ]);
  });

  it('says a conflict when a draft Change also conflicts, because one modifier shows', () => {
    const [change] = sessionPullRequests(
      reading({ ...open, draft: true, conflict: true }),
    );

    expect(change).toMatchObject({ modifier: 'conflict', mergeable: false });
  });

  it('shows draft on an Open Change that only is a draft', () => {
    const [change] = sessionPullRequests(reading({ ...open, draft: true }));

    expect(change).toMatchObject({ modifier: 'draft', mergeable: true });
  });

  it('gives a Merged Change no modifier', () => {
    const [change] = sessionPullRequests(
      reading({ ...open, stage: 'merged', draft: true }),
    );

    expect(change).not.toHaveProperty('modifier');
  });

  it('leaves out a Change without a PR number, which has nothing to draw as a PR', () => {
    const working: Change = { id: 'local', stage: 'working', title: 'Work' };

    expect(sessionPullRequests(reading(working, open))).toHaveLength(1);
  });

  it('keeps the same number in two repositories as two Changes in the Plugin’s order', () => {
    const fork: Change = {
      ...open,
      id: 'github:fork/repository#12',
      repository: 'fork/repository',
    };

    expect(
      sessionPullRequests(reading(open, fork)).map(({ id }) => id),
    ).toEqual([ownedId, 'github:fork/repository#12']);
  });
});
