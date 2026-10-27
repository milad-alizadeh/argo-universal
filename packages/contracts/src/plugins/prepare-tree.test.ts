import { describe, expect, it } from 'vitest';
import { prepareWireTree } from './prepare-tree';
import type { WireNode } from './wire';

const updateMessage = 'Update Argo to see this';

const label: WireNode = {
  type: 'Text',
  key: 'label',
  props: { children: 'Readable', accessibilityLabel: 'Accessible' },
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

describe('Plugin wire preparation', () => {
  it('keeps a valid tree as it is', () => {
    expect(prepareWireTree(stack)).toEqual(stack);
  });

  it.each([
    { ...stack, props: { direction: 'diagonal' } },
    { ...stack, props: { direction: 'row', gap: 7 }, children: [] },
    { ...stack, type: 'FutureContainer' },
    { ...stack, props: { direction: 'row', style: {} } },
    { ...stack, slots: { media: [label] } },
    {
      ...stack,
      type: 'ListItem',
      props: { title: 'Row' },
      slots: { trailing: [{ ...label, type: 'Button' }] },
    },
    {
      ...stack,
      type: 'ListItem',
      props: { title: 'Row' },
      slots: { meta: [label] },
    },
    {
      ...stack,
      type: 'ListItem',
      props: { title: 'Row' },
      slots: { accessory: [label] },
    },
    {
      ...stack,
      type: 'ListItem',
      props: { title: 'Row', progress: { value: 1.5 } },
    },
  ])(
    'replaces an invalid or unsupported container with the update fallback',
    (root) => {
      expect(prepareWireTree(root)).toEqual({
        type: 'Text',
        key: 'stack',
        props: {
          children: updateMessage,
          role: 'secondary',
          tone: 'muted',
        },
        children: [],
        slots: {},
      });
    },
  );

  it('drops malformed and unknown leaves while keeping siblings', () => {
    const bad = { ...label, props: { children: true } };
    const unknown = { ...label, type: 'Sparkline' };

    expect(
      prepareWireTree({ ...stack, children: [bad, unknown, label] }).children,
    ).toEqual([label]);
  });

  it('strips unknown optional props', () => {
    expect(
      prepareWireTree({ ...label, props: { ...label.props, future: true } }),
    ).toEqual(label);
  });

  it('preserves every named-slot node', () => {
    const root: WireNode = {
      type: 'List',
      key: 'list',
      props: {},
      children: [],
      slots: { empty: [stack, label] },
    };

    expect(prepareWireTree(root).slots).toEqual({ empty: [stack, label] });
  });

  it('refuses undeclared slots and kit components outside their closed accepted set', () => {
    const root: WireNode = {
      type: 'List',
      key: 'list',
      props: {},
      children: [],
      slots: { unknown: [label] },
    };

    expect(prepareWireTree(root).props['children']).toBe(updateMessage);
    expect(
      prepareWireTree({
        ...root,
        slots: { empty: [{ ...stack, type: 'Svg' }] },
      }).props['children'],
    ).toBe(updateMessage);
  });

  it.each([
    {
      type: 'Menu',
      props: {
        accessibilityLabel: 'Sort',
        actions: [{ label: 'Name', onPress: { $event: 'onPress' } }],
      },
    },
    {
      type: 'SearchField',
      props: {
        label: 'Search',
        value: '',
        onChangeText: { $event: 'onChangeText' },
      },
    },
    {
      type: 'FilterPill',
      props: {
        label: 'Open',
        selected: false,
        onPress: { $event: 'onPress' },
      },
    },
  ])('refuses $type, a kit component only the App draws', (refused) => {
    const root = { ...stack, children: [label, { ...label, ...refused }] };

    expect(prepareWireTree(root)).toEqual({ ...stack, children: [label] });
  });
});
