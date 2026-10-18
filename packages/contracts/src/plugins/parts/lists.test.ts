import { describe, expect, it } from 'vitest';
import { pluginPartSchemas } from '../plugin-part-schemas';
import { acceptsSlots } from '../prepare-slots';
import type { WireNode } from '../wire';

const list = pluginPartSchemas.List;

function node(type: string): WireNode {
  return { type, key: type, props: {}, children: [], slots: {} };
}

describe('List part schema', () => {
  it('accepts EmptyState in the empty Slot', () => {
    expect(
      acceptsSlots(
        { ...node('List'), slots: { empty: [node('EmptyState')] } },
        list.slots,
      ),
    ).toBe(true);
  });

  it('rejects parts other than EmptyState in the empty Slot', () => {
    expect(
      acceptsSlots(
        { ...node('List'), slots: { empty: [node('Text')] } },
        list.slots,
      ),
    ).toBe(false);
  });

  it('allows search text events only in Plugin search mode', () => {
    const event = 'text entered by the user';

    expect(
      list.props.safeParse({ searchMode: 'plugin', onSearchTextChange: event })
        .success,
    ).toBe(true);
    expect(
      list.props.safeParse({ searchMode: 'app', onSearchTextChange: event })
        .success,
    ).toBe(false);
    expect(list.props.safeParse({ onSearchTextChange: event }).success).toBe(
      false,
    );
  });
});
