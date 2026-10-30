import type { ToolCallUpdate } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { requireGroup } from '../../../../mocks/feed-items.mocks';
import { commandRow, workMocks } from '../../../../mocks/feed-view.mocks';
import { keepUnchangedItems } from './keep-unchanged-items';
import { toFeedView } from './to-feed-view';

function recording(): (typeof workMocks)[number] {
  const [mock] = workMocks;

  if (!mock) throw new Error('No recording');

  return mock;
}

const keptObjects = (
  previous: readonly unknown[],
  next: readonly unknown[],
): boolean[] => next.map((item, index) => item === previous[index]);

// Wire rows are new objects when they change, so an item is kept only when every field of it is unchanged.
describe('keepUnchangedItems by field', () => {
  it('hands back a new item for a row that is equal but not the same object', () => {
    const mock = recording();
    const previous = toFeedView(mock.rows, mock.snapshot);

    const next = keepUnchangedItems(
      previous,
      toFeedView(
        mock.rows.map((row) => ({ ...row })),
        mock.snapshot,
      ),
    );

    expect(keptObjects(previous.items, next.items)).toEqual(
      previous.items.map(() => false),
    );
  });

  it('rebuilds a group whose nested row gained a Permission outcome', () => {
    const mock = recording();
    const first = commandRow(mock.rows);
    const second: ToolCallUpdate = { ...first, id: 'second-command' };

    const answered: ToolCallUpdate = {
      ...second,
      _meta: {
        argo: {
          permissionOutcome: {
            outcome: 'selected',
            optionId: 'allow_once',
            name: 'Allow',
            kind: 'allow_once',
          },
        },
      },
    };

    const previous = toFeedView([first, second], mock.snapshot);

    const next = keepUnchangedItems(
      previous,
      toFeedView([first, answered], mock.snapshot),
    );

    expect(keptObjects(previous.items, next.items)).toEqual([false]);
    expect(requireGroup(next.items[0]).items[0]).toBe(
      requireGroup(previous.items[0]).items[0],
    );
    expect(requireGroup(next.items[0]).items[1]).toEqual({
      type: 'tool_call',
      row: answered,
    });
  });

  it('hands back the new Exploration when only its state changed', () => {
    const mock = recording();

    const row: ToolCallUpdate = {
      ...commandRow(mock.rows),
      state: 'settled',
      status: 'completed',
      _meta: {
        argo: { commandActions: [{ type: 'read', command: '', path: 'a.ts' }] },
      },
    };

    const settled = toFeedView([row], mock.snapshot);

    const reopened = {
      ...settled,
      items: settled.items.map((item) =>
        item.type === 'exploration'
          ? { ...item, state: 'open' as const }
          : item,
      ),
    };

    const next = keepUnchangedItems(reopened, settled);

    expect(next.items[0]).toBe(settled.items[0]);
  });
});
