import { describe, expect, it } from 'vitest';
import { kitComponent } from './kit';
import { supportsWireNode } from './prepare-tree';
import type { WireNode } from './wire';

const picker = 'Metadata.Picker';

const labels = {
  title: 'Labels',
  value: ['bug'],
  multiple: true,
  searchable: true,
  createLabel: 'Create label',
  options: [{ value: 'bug', label: 'bug' }],
};

function node(type: string, children: WireNode[] = []): WireNode {
  return { type, key: type, props: {}, children, slots: {} };
}

// A Picker holding one child, as a page draws it.
const holding = (type: string): WireNode => ({
  ...node(picker, [node(type)]),
  props: { title: 'Labels', value: 'bug', options: [] },
});

describe('Metadata.Picker', () => {
  it('accepts its props', () => {
    expect(kitComponent(picker)?.props.parse(labels)).toEqual(labels);
  });

  it.each([
    { title: 'Labels', value: 'bug' },
    {
      title: 'Labels',
      value: 'bug',
      options: [{ value: 'bug', label: 'bug', color: 'red' }],
    },
  ])('rejects malformed props %#', (props) => {
    expect(kitComponent(picker)?.props.safeParse(props).success).toBe(false);
  });

  it.each([
    'Metadata.Label',
    'Metadata.Pills',
    'Metadata.StatusDot',
    'Metadata.Avatar',
  ])('shows its value as a %s child', (type) => {
    expect(supportsWireNode(holding(type))).toBe(true);
  });

  it.each(['Text', 'Metadata.Link', picker])(
    'rejects %s as its child',
    (type) => {
      expect(supportsWireNode(holding(type))).toBe(false);
    },
  );

  it('is a Metadata child', () => {
    expect(
      supportsWireNode(node('Metadata', [holding('Metadata.Label')])),
    ).toBe(true);
  });
});
