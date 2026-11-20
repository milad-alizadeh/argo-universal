import { describe, expect, it } from 'vitest';
import { prepareWireTree } from '../prepare-tree';
import type { WireNode } from '../wire';

const node = (
  type: string,
  props: WireNode['props'],
  children: WireNode[] = [],
): WireNode => ({ type, key: type, props, children, slots: {} });

const fader = (props: WireNode['props'], children: WireNode[] = []) =>
  node(
    'Fader',
    {
      value: 80,
      minimumValue: 0,
      maximumValue: 100,
      step: 1,
      accessibilityLabel: 'Volume',
      valueLabel: '80%',
      onValueChange: { pageState: { level: { $payload: true } } },
      ...props,
    },
    children,
  );

// What the Server leaves of a Fader inside a Grid.
const kept = (tile: WireNode): WireNode[] =>
  prepareWireTree(node('Grid', { columns: 2 }, [tile])).children;

const content = [
  node('Text', { children: 'Kitchen', role: 'row' }),
  node('IconButton', {
    icon: 'plug',
    accessibilityLabel: 'Mute',
    onPress: { pageState: { muted: true } },
  }),
];

describe('a Fader', () => {
  it('keeps any kit content on its surface, with a gradient fill', () => {
    const tile = fader(
      { orientation: 'vertical', fill: ['#FFB45A', '#FF7A3D'] },
      content,
    );

    expect(kept(tile)).toEqual([tile]);
  });

  it('fills with the accent tone when given no colours', () => {
    const tile = fader({ orientation: 'horizontal' });

    expect(kept(tile)).toEqual([tile]);
  });

  it.each([
    ['a colour name', { fill: ['orange'] }],
    ['an orientation it does not know', { orientation: 'diagonal' }],
  ])('refuses %s, leaving the update message in its place', (_, props) => {
    expect(kept(fader(props))).toMatchObject([
      { type: 'Text', props: { children: 'Update Argo to see this' } },
    ]);
  });
});
