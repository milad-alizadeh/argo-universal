import { describe, expect, it } from 'vitest';
import { kitComponent } from './kit';
import { supportsWireNode } from './prepare-tree';
import type { WireNode } from './wire';

const picker = 'FieldGroup.Picker';

const value = 'FieldGroup.Value';

const labels = {
  title: 'Labels',
  value: ['bug'],
  presentation: 'page',
  multiple: true,
  searchable: true,
  createLabel: 'Create label',
  options: [{ value: 'bug', label: 'bug', avatar: true }],
};

function node(type: string, children: WireNode[] = []): WireNode {
  return { type, key: type, props: {}, children, slots: {} };
}

const holding = (type: string, child: string): WireNode => ({
  ...node(type, [node(child)]),
  props: { title: 'Labels', value: 'bug', presentation: 'page', options: [] },
});

const readOnly = ['Label', 'Pill', 'StatusDot', 'Avatar', 'Link', 'Icon'];

describe('a read-only FieldGroup row', () => {
  it('takes a Picker that searches and creates its options', () => {
    expect(kitComponent(picker)?.props.parse(labels)).toEqual(labels);
  });

  it('rejects an option colour that is not #rrggbb', () => {
    const red = {
      ...labels,
      options: [{ value: 'bug', label: 'bug', color: 'red' }],
    };

    expect(kitComponent(picker)?.props.safeParse(red).success).toBe(false);
  });

  it('takes a Value with no words of its own', () => {
    expect(kitComponent(value)?.props.parse({ title: 'Labels' })).toEqual({
      title: 'Labels',
    });
  });

  it.each(readOnly)('shows a Value as a %s child', (child) => {
    expect(supportsWireNode(holding(value, child))).toBe(true);
  });

  it.each(readOnly)('shows a Picker’s value as a %s child', (child) => {
    expect(supportsWireNode(holding(picker, child))).toBe(true);
  });

  it.each(['Text', 'ListItem', value])('rejects %s as a value', (child) => {
    expect(supportsWireNode(holding(value, child))).toBe(false);
  });
});
