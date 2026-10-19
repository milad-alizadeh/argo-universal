import { describe, expect, it } from 'vitest';
import { legacyPartVersions } from './kit';
import { prepareWireTree } from './prepare-tree';
import type { WireNode } from './wire';

const svg: WireNode = {
  type: 'Svg',
  key: 'diagram',
  props: {
    xml: '<svg/>',
    label: 'Service map',
    tone: 'info',
    aspectRatio: 1.5,
    onPress: { $event: 'onPress' },
  },
  children: [],
  slots: {},
};

describe('Svg wire part', () => {
  it('preserves Svg props for a compatible App', () => {
    expect(prepareWireTree(svg, { Svg: 1 })).toEqual(svg);
  });

  it('replaces Svg when the receiving App does not support it', () => {
    expect(prepareWireTree(svg, {})).toEqual(emptySvg());
  });

  it.each([
    { ...svg, props: { ...svg.props, xml: 'x'.repeat(131_073) } },
    { ...svg, props: { ...svg.props, label: '' } },
    { ...svg, props: { ...svg.props, tone: 'chart-1' } },
    { ...svg, props: { ...svg.props, aspectRatio: Number.POSITIVE_INFINITY } },
  ])('rejects invalid Svg props through its registered schema', (root) => {
    expect(prepareWireTree(root, { Svg: 1 })).toEqual(emptySvg());
  });

  it('preserves Svg in an ordinary named Slot', () => {
    const text: WireNode = {
      type: 'Text',
      key: 'label',
      props: { children: 'Readable' },
      children: [],
      slots: {},
    };

    const root: WireNode = {
      type: 'ListItem',
      key: 'item',
      props: { title: 'Slotted' },
      children: [],
      slots: { leading: [text, svg] },
    };

    expect(
      prepareWireTree(root, { ...legacyPartVersions, ListItem: 3, Svg: 1 })
        .slots,
    ).toEqual({
      leading: [{ ...text, props: { label: 'Readable' } }, svg],
    });
  });
});

function emptySvg(): WireNode {
  return { type: '#empty', key: svg.key, props: {}, children: [], slots: {} };
}
