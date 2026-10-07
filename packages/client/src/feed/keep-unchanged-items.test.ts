import { recordedFeedMocks } from '@repo/api/mocks';
import type { SessionUpdate } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
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
const keptObjects = (previous: readonly unknown[], next: readonly unknown[]) =>
  next.map((item, index) => item === previous[index]);

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
    'rebuilds only the item that holds a changed row for $agent',
    ({ rows, snapshot }) => {
      const previous = toFeedView(rows, snapshot);
      const groupIndex = previous.items.findIndex(
        (item) => item.type === 'group',
      );
      const group = previous.items[groupIndex];
      if (group?.type !== 'group') throw new Error('Recording needs a group');
      const changedIndex = group.items.findIndex(
        (activity) =>
          activity.type === 'tool_call' || activity.type === 'exploration',
      );
      const changed = group.items[changedIndex];
      if (changed?.type !== 'tool_call' && changed?.type !== 'exploration')
        throw new Error('Group needs a tool call');
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
      const nextGroup = next.items[groupIndex];
      if (nextGroup?.type !== 'group') throw new Error('Group expected');
      expect(keptObjects(group.items, nextGroup.items)).toEqual(
        group.items.map((_, index) => index !== changedIndex),
      );
    },
  );

  it('keeps nothing without a previous view', () => {
    const [mock] = mocks;
    if (!mock) throw new Error('No recording');
    const next = toFeedView(mock.rows, mock.snapshot);
    expect(keepUnchangedItems(null, next)).toBe(next);
  });
});
