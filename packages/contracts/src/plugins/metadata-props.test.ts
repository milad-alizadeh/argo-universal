import { describe, expect, it } from 'vitest';
import { wirePart } from './kit';
import { supportsWireNode } from './prepare-tree';
import type { WireNode } from './wire';

const labelPart = 'Metadata.Label';

const accepted = [
  {
    type: labelPart,
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

const parts = { Metadata: 1, 'Metadata.Pills': 1, Pill: 1 };

function node(type: string, children: WireNode[] = []): WireNode {
  return { type, key: type, props: {}, children, slots: {} };
}

describe('Metadata fields', () => {
  it.each(accepted)('accepts $type props', ({ type, props }) => {
    expect(wirePart(type)?.props.parse(props)).toEqual(props);
  });

  it.each([
    { type: labelPart, props: { title: 'Path', text: 12 } },
    { type: 'Metadata.Link', props: { title: 'Docs', text: 'Argo' } },
    {
      type: 'Metadata.StatusDot',
      props: { title: 'Checks', text: 'Passed', tone: 'unknown' },
    },
    { type: 'Metadata.Avatar', props: { title: 'Assignee', src: 'image.png' } },
  ])('rejects malformed $type props', ({ type, props }) => {
    expect(wirePart(type)?.props.safeParse(props).success).toBe(false);
  });

  it.each(accepted)('accepts $type as a Metadata child', ({ type }) => {
    expect(supportsWireNode(node('Metadata', [node(type)]), parts)).toBe(true);
  });

  it.each(['Text', 'Pill', 'ListItem', 'Metadata'])(
    'rejects %s as a Metadata child',
    (type) => {
      expect(supportsWireNode(node('Metadata', [node(type)]), parts)).toBe(
        false,
      );
    },
  );

  it.each([
    ['Pill', true],
    ['Text', false],
    [labelPart, false],
  ] as const)('Metadata.Pills accepts %s: %s', (type, expected) => {
    const pills = {
      ...node('Metadata.Pills', [node(type)]),
      props: { title: 'Labels' },
    };

    expect(supportsWireNode(pills, parts)).toBe(expected);
  });
});
