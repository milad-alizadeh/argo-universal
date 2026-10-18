import { describe, expect, it } from 'vitest';
import { legacyPartVersions, versionsOf } from './kit';
import { prepareWireTree } from './prepare-tree';
import type { WireNode } from './wire';

describe('Plugin part version compatibility', () => {
  const title = 'Waiting jobs';

  it('derives versions only for registered parts', () => {
    expect(
      versionsOf(['Text', 'Stack', 'GroupedListItem', 'Pill', 'Internal']),
    ).toEqual({ Text: 2, Stack: 1, GroupedListItem: 1, Pill: 2 });
  });

  it('strips unknown optional props for older Apps', () => {
    const label: WireNode = {
      type: 'Text',
      key: 'label',
      props: { label: 'Readable', accessibilityLabel: 'Accessible' },
      children: [],
      slots: {},
    };

    expect(
      prepareWireTree(
        { ...label, props: { ...label.props, future: true } },
        { Text: 2 },
      ),
    ).toEqual(label);
  });

  it('strips status badges for Apps that only support ListItem v1', () => {
    const row: WireNode = {
      type: 'ListItem',
      key: 'item',
      props: {
        title,
        badge: { kind: 'status', tone: 'success', label: 'Ready' },
      },
      children: [],
      slots: {},
    };

    expect(
      prepareWireTree(row, { ...legacyPartVersions, ListItem: 1 }),
    ).toEqual({
      ...row,
      props: { title },
    });
  });

  it('downgrades count badges to the numeric badge supported by ListItem v1', () => {
    const row: WireNode = {
      type: 'ListItem',
      key: 'item',
      props: {
        title,
        badge: { kind: 'count', count: 3, label: '3 waiting jobs' },
      },
      children: [],
      slots: {},
    };

    expect(
      prepareWireTree(row, { ...legacyPartVersions, ListItem: 1 }),
    ).toEqual({
      ...row,
      props: { title, badge: 3 },
    });
  });
});
