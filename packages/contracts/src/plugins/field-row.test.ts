import { describe, expect, it } from 'vitest';
import { prepareWireTree } from './prepare-tree';
import type { WireNode } from './wire';

const updateMessage = 'Update Argo to see this';

const node = (
  type: string,
  props: WireNode['props'],
  children: WireNode[] = [],
): WireNode => ({ type, key: type, props, children, slots: {} });

const warm = '#FFB45A';

const swatch = node('Swatch', {
  colors: [warm, '#FF7A3D'],
  accessibilityLabel: 'Warm white',
});

const name = node('Text', { children: 'Desk lamp', role: 'row' });

const power = node('Switch', {
  value: true,
  accessibilityLabel: 'Desk lamp',
  onValueChange: { pageState: { on: { $payload: true } } },
});

const brightness = node('Slider', {
  value: 80,
  minimumValue: 1,
  maximumValue: 100,
  step: 1,
  accessibilityLabel: 'Brightness',
  valueLabel: '80%',
  fill: [warm],
});

// A light's row: its colour, its name and switch on one line, its brightness below.
const lightRow = node('FieldGroup.Row', { id: 'light-desk' }, [
  node('Stack', { direction: 'column', gap: 2 }, [
    node('Stack', { direction: 'row', gap: 3, align: 'center' }, [
      swatch,
      name,
      power,
    ]),
    brightness,
  ]),
]);

const section = (row: WireNode): WireNode =>
  node('FieldGroup.Section', { title: 'Office' }, [row]);

const fallback = {
  type: 'Text',
  key: 'FieldGroup.Row',
  props: { children: updateMessage, role: 'secondary', tone: 'muted' },
  children: [],
  slots: {},
};

describe('a composed FieldGroup row', () => {
  it('keeps a row of a Swatch, Text, Switch and Slider in a Section', () => {
    expect(prepareWireTree(section(lightRow))).toEqual(section(lightRow));
  });

  it.each([
    ['a Button', node('Button', { title: 'More' })],
    ['a Card', node('Card', { title: 'Nested' })],
  ])('refuses %s anywhere inside it', (_, stranger) => {
    const row = node('FieldGroup.Row', {}, [
      node('Stack', { direction: 'row' }, [name, stranger]),
    ]);

    expect(prepareWireTree(section(row)).children).toEqual([fallback]);
  });
});

describe('a colour that is data', () => {
  const parsed = (colors: unknown): WireNode =>
    prepareWireTree(
      node('Stack', { direction: 'row' }, [
        node('Swatch', { colors, accessibilityLabel: 'Light' }),
      ]),
    );

  it.each([[[warm]], [[warm, '#7A5CFF', '#FF4FA0', '#FFFFFF']]])(
    'takes one to four sRGB stops on a Swatch',
    (colors) => {
      expect(parsed(colors).children[0]?.props.colors).toEqual(colors);
    },
  );

  it.each([
    ['a colour name', ['red']],
    ['a short hex', ['#FA0']],
    ['an alpha channel', ['#FFB45A80']],
    ['five stops', [warm, warm, warm, warm, warm]],
    ['no stops', []],
  ])('refuses %s', (_, colors) => {
    expect(parsed(colors).children).toEqual([]);
  });

  it('draws a Swatch with no colours as an empty dot', () => {
    const empty = node('Swatch', { accessibilityLabel: 'Off' });

    expect(
      prepareWireTree(node('Stack', { direction: 'row' }, [empty])).children,
    ).toEqual([empty]);
  });

  it('refuses a Slider fill that is not sRGB hex', () => {
    const named = {
      ...brightness,
      props: { ...brightness.props, fill: ['orange'] },
    };

    expect(
      prepareWireTree(node('Stack', { direction: 'row' }, [named])).children,
    ).toEqual([]);
  });
});
