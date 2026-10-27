import { describe, expect, it } from 'vitest';
import { kitComponent } from './kit';
import { supportsWireNode } from './prepare-tree';
import type { WireNode } from './wire';

const labelComponent = 'Metadata.Label';

const accepted = [
  {
    type: labelComponent,
    props: { title: 'Path', text: '~/Developer/argo', icon: 'computer' },
  },
  {
    type: 'Metadata.Link',
    props: { title: 'Docs', text: 'Argo', href: 'https://example.com' },
  },
  { type: 'Metadata.Pills', props: { title: 'Labels' } },
  {
    type: 'Metadata.StatusDot',
    props: { title: 'Checks', text: 'Passed', tone: 'success' },
  },
  {
    type: 'Metadata.Avatar',
    props: {
      title: 'Assignee',
      name: 'Milad Alizadeh',
      src: 'https://example.com/avatar.png',
    },
  },
];

function node(type: string, children: WireNode[] = []): WireNode {
  return { type, key: type, props: {}, children, slots: {} };
}

describe('Metadata fields', () => {
  it.each(accepted)('accepts $type props', ({ type, props }) => {
    expect(kitComponent(type)?.props.parse(props)).toEqual(props);
  });

  it.each([
    { type: labelComponent, props: { title: 'Path', text: 12 } },
    { type: 'Metadata.Link', props: { title: 'Docs', text: 'Argo' } },
    {
      type: 'Metadata.StatusDot',
      props: { title: 'Checks', text: 'Passed', tone: 'unknown' },
    },
    { type: 'Metadata.Avatar', props: { title: 'Assignee', src: 'image.png' } },
  ])('rejects malformed $type props', ({ type, props }) => {
    expect(kitComponent(type)?.props.safeParse(props).success).toBe(false);
  });

  it.each(accepted)('accepts $type as a Metadata child', ({ type }) => {
    expect(supportsWireNode(node('Metadata', [node(type)]))).toBe(true);
  });

  it.each(['Text', 'Pill', 'ListItem', 'Metadata'])(
    'rejects %s as a Metadata child',
    (type) => {
      expect(supportsWireNode(node('Metadata', [node(type)]))).toBe(false);
    },
  );

  it.each([
    ['Pill', true],
    ['Text', false],
    [labelComponent, false],
  ] as const)('Metadata.Pills accepts %s: %s', (type, expected) => {
    const pills = {
      ...node('Metadata.Pills', [node(type)]),
      props: { title: 'Labels' },
    };

    expect(supportsWireNode(pills)).toBe(expected);
  });
});
