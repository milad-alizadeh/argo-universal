import type { SessionUpdate } from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';
import {
  requireGroup,
  requireCollapsible,
  changedActivity,
} from '../../../../mocks/feed-items.mocks';
import { keepUnchangedItems } from './keep-unchanged-items';
import { toFeedView } from './to-feed-view';

const mocks = recordedFeedMocks.filter(
  (mock) => mock.recording === 'edit-and-command',
);

// A new revision of the row, as a `row.patch` brings it.
function bumpRevision(
  rows: readonly SessionUpdate[],
  id: string,
): SessionUpdate[] {
  return rows.map((row) =>
    row.id === id ? { ...row, revision: row.revision + 1 } : row,
  );
}

// For each next item, whether it is the previous item's own object.
const keptObjects = (
  previous: readonly unknown[],
  next: readonly unknown[],
): boolean[] => next.map((item, index) => item === previous[index]);

describe('keepUnchangedItems', () => {
  it.each(mocks)(
    'hands back every item when no row changed for $agent',
    ({ rows, snapshot }) => {
      const previous = toFeedView(rows, snapshot);
      const next = keepUnchangedItems(previous, toFeedView(rows, snapshot));
      expect(keptObjects(previous.items, next.items)).toEqual(
        previous.items.map(() => true),
      );
    },
  );

  it.each(mocks)(
    'hands back every item when only the Session title changed for $agent',
    ({ rows, snapshot }) => {
      const previous = toFeedView(rows, snapshot);
      const renamed = { ...snapshot, title: `${snapshot.title} (renamed)` };
      const next = keepUnchangedItems(previous, toFeedView(rows, renamed));
      expect(keptObjects(previous.items, next.items)).toEqual(
        previous.items.map(() => true),
      );
    },
  );

  it.each(mocks)(
    'rebuilds only the item that holds a changed row for $agent',
    ({ rows, snapshot }) => {
      const previous = toFeedView(rows, snapshot);

      const groupIndex = previous.items.findIndex(
        (item) => item.type === 'group',
      );

      const group = requireGroup(previous.items[groupIndex]);

      const changedIndex = group.items.findIndex(
        (activity) =>
          activity.type === 'tool_call' || activity.type === 'exploration',
      );

      const changed = changedActivity(group.items[changedIndex]);

      const changedId =
        changed.type === 'tool_call' ? changed.row.id : changed.id;

      const changedRows = bumpRevision(rows, changedId);

      const next = keepUnchangedItems(
        previous,
        toFeedView(changedRows, snapshot),
      );

      expect(keptObjects(previous.items, next.items)).toEqual(
        previous.items.map((_, index) => index !== groupIndex),
      );
      const nextGroup = requireGroup(next.items[groupIndex]);
      expect(keptObjects(group.items, nextGroup.items)).toEqual(
        group.items.map((_, index) => index !== changedIndex),
      );
    },
  );

  it.each(mocks)(
    "keeps a group's key when an older page brings its first rows for $agent",
    ({ rows, snapshot }) => {
      const group = requireGroup(
        toFeedView(rows, snapshot).items.find((item) => item.type === 'group'),
      );

      // The newer page starts at the group's second row.
      const start = rows.findIndex((row) => row.id === group.id) + 1;
      const previous = toFeedView(rows.slice(start), snapshot);
      const previousGroup = requireCollapsible(previous.items[0]);
      const next = keepUnchangedItems(previous, toFeedView(rows, snapshot));
      expect(
        requireGroup(next.items.find((item) => item.type === 'group')).id,
      ).toBe(previousGroup.id);
    },
  );

  it('keeps nothing without a previous view', () => {
    const [mock] = mocks;

    if (!mock) throw new Error('No recording');
    const next = toFeedView(mock.rows, mock.snapshot);
    expect(keepUnchangedItems(null, next)).toBe(next);
  });
});
