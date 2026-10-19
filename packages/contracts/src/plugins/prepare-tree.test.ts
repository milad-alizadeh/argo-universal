import { describe, expect, it } from 'vitest';
import { legacyPartVersions } from './kit';
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

describe('Plugin wire compatibility', () => {
  it('strips newer optional props for an older App without losing the part', () => {
    expect(prepareWireTree(label, { Text: 1 })).toEqual({
      ...label,
      props: { label: 'Readable' },
    });
    expect(prepareWireTree(label, { Text: 2 })).toEqual({
      ...label,
      props: { label: 'Readable', accessibilityLabel: 'Accessible' },
    });
  });

  it('lowers Stack to Row or Column with its key, layout and children', () => {
    const parts = { ...legacyPartVersions, Text: 3 };

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
    const bad = { ...label, props: { children: true } };
    const unknown = { ...label, type: 'Sparkline' };

    expect(
      prepareWireTree({ ...stack, children: [bad, unknown, label] }).children,
    ).toEqual([{ ...label, props: { label: 'Readable' } }]);
  });

  it('strips unknown optional props', () => {
    expect(
      prepareWireTree(
        { ...label, props: { ...label.props, future: true } },
        { Text: 3 },
      ),
    ).toEqual(label);
  });

  it('preserves every named-slot node while lowering its parts for the App', () => {
    const root: WireNode = {
      type: 'List',
      key: 'list',
      props: {},
      children: [],
      slots: { empty: [stack, label] },
    };

    expect(
      prepareWireTree(root, { ...legacyPartVersions, List: 2 }).slots,
    ).toEqual({
      empty: [
        {
          ...stack,
          type: 'Row',
          props: { gap: 2 },
          children: [{ ...label, props: { label: 'Readable' } }],
        },
        { ...label, props: { label: 'Readable' } },
      ],
    });
  });

  it('refuses undeclared slots and parts outside their closed accepted set', () => {
    const root: WireNode = {
      type: 'List',
      key: 'list',
      props: {},
      children: [],
      slots: { unknown: [label] },
    };

    const parts = { ...legacyPartVersions, List: 2 };

    expect(prepareWireTree(root, parts).props['label']).toBe(
      'Update Argo to see this',
    );
    expect(
      prepareWireTree(
        { ...root, slots: { empty: [{ ...stack, type: 'Svg' }] } },
        parts,
      ).props['label'],
    ).toBe(updateMessage);
  });
});
