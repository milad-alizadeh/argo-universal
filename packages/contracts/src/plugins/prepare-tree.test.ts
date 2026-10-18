import { describe, expect, it } from 'vitest';
import { legacyPartVersions, versionsOf } from './kit';
import { prepareWireTree } from './prepare-tree';
import type { WireNode } from './wire';

const updateMessage = 'Update Argo to see this';

const label: WireNode = {
  type: 'Text',
  key: 'label',
  props: { label: 'Readable', accessibilityLabel: 'Accessible' },
  children: [],
  slots: {},
};

const stack: WireNode = {
  type: 'Stack',
  key: 'stack',
  props: { direction: 'row', gap: 2 },
  children: [label],
  slots: {},
};

describe('Plugin wire compatibility', () => {
  it('strips newer optional props for an older App without losing the part', () => {
    expect(prepareWireTree(label, { Text: 1 })).toEqual({
      ...label,
      props: { label: 'Readable' },
    });
    expect(prepareWireTree(label, { Text: 2 })).toEqual(label);
  });

  it('lowers Stack to Row or Column with its key, layout and children', () => {
    const parts = { ...legacyPartVersions, Text: 2 };

    expect(prepareWireTree(stack, parts)).toEqual({
      ...stack,
      type: 'Row',
      props: { gap: 2 },
    });
    expect(
      prepareWireTree({ ...stack, props: { direction: 'column' } }, parts),
    ).toEqual({ ...stack, type: 'Column', props: {} });
  });

  it('keeps supported Stack and accepts an App newer than this Server', () => {
    expect(prepareWireTree(stack, { Text: 10, Stack: 10 })).toEqual(stack);
  });

  it.each([
    { ...stack, props: { direction: 'diagonal' } },
    { ...stack, props: { direction: 'row', gap: 7 }, children: [] },
    { ...stack, type: 'FutureContainer' },
    { ...stack, props: { direction: 'row', style: {} } },
    { ...stack, slots: { media: [label] } },
  ])(
    'replaces an invalid or unsupported container with the update fallback',
    (root) => {
      expect(prepareWireTree(root)).toEqual({
        type: 'Text',
        key: 'stack',
        props: {
          label: updateMessage,
          variant: 'secondary',
          tone: 'muted',
        },
        children: [],
        slots: {},
      });
    },
  );

  it('drops malformed and unknown leaves while keeping siblings', () => {
    const bad = { ...label, props: { label: 42 } };
    const unknown = { ...label, type: 'Sparkline' };

    expect(
      prepareWireTree({ ...stack, children: [bad, unknown, label] }).children,
    ).toEqual([{ ...label, props: { label: 'Readable' } }]);
  });

  it('derives versions only for registered parts and strips unknown optional props', () => {
    expect(versionsOf(['Text', 'Stack', 'Internal'])).toEqual({
      Text: 2,
      Stack: 1,
    });
    expect(
      prepareWireTree(
        { ...label, props: { ...label.props, future: true } },
        { Text: 2 },
      ),
    ).toEqual(label);
  });

  it('refuses undeclared slots and parts outside their closed accepted set', () => {
    const root: WireNode = {
      type: 'GroupedListItem',
      key: 'item',
      props: { label: 'Invalid' },
      children: [],
      slots: { unknown: [label] },
    };

    const parts = { ...legacyPartVersions, GroupedListItem: 1 };

    expect(prepareWireTree(root, parts).props['label']).toBe(
      'Update Argo to see this',
    );
    expect(
      prepareWireTree(
        { ...root, slots: { leading: [{ ...stack, type: 'VirtualList' }] } },
        parts,
      ).props['label'],
    ).toBe(updateMessage);
  });
});
