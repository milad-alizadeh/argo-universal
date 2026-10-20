import { describe, expect, it } from 'vitest';
import { prepareWireTree } from './prepare-tree';
import type { WireNode } from './wire';
import { svgCharacterLimit } from './wire-limits';

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
  it('preserves valid Svg props', () => {
    expect(prepareWireTree(svg)).toEqual(svg);
  });

  it.each([
    {
      ...svg,
      props: { ...svg.props, xml: 'x'.repeat(svgCharacterLimit + 1) },
    },
    { ...svg, props: { ...svg.props, label: '' } },
    { ...svg, props: { ...svg.props, tone: 'chart-1' } },
    { ...svg, props: { ...svg.props, aspectRatio: Number.POSITIVE_INFINITY } },
  ])('rejects invalid Svg props through its registered schema', (root) => {
    expect(prepareWireTree(root)).toEqual(emptySvg());
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

    expect(prepareWireTree(root).slots).toEqual({ leading: [text, svg] });
  });
});

function emptySvg(): WireNode {
  return { type: '#empty', key: svg.key, props: {}, children: [], slots: {} };
}
