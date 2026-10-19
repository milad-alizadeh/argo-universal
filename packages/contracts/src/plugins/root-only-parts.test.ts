import { describe, expect, it } from 'vitest';
import { currentPartVersions } from './kit';
import { prepareWireTree } from './prepare-tree';
import { replacementTreeReason } from './replacement-tree';
import type { WireNode } from './wire';

const page: WireNode = {
  type: 'Page',
  key: 'page',
  props: { title: 'Issues' },
  children: [],
  slots: {},
};

const host = (type: string, props: WireNode['props']): WireNode => ({
  type,
  key: 'host',
  props,
  children: [page],
  slots: {},
});

describe('a root-only part', () => {
  it('stays when it is the tree root', () => {
    expect(prepareWireTree(page, currentPartVersions)).toEqual(page);
  });

  it.each([
    host('Stack', { direction: 'column' }),
    host('Page', { title: 'Host' }),
  ])('is refused as a child of $type', (root) => {
    expect(prepareWireTree(root, currentPartVersions).children).toEqual([
      {
        type: 'Text',
        key: 'page',
        props: {
          children: 'Update Argo to see this',
          role: 'secondary',
          tone: 'muted',
        },
        children: [],
        slots: {},
      },
    ]);
  });

  it.each([page, host('Stack', { direction: 'column' })])(
    'refuses a Replaceable Slot tree that holds it ($type)',
    (root) => {
      expect(replacementTreeReason(root, currentPartVersions)).toBe(
        'Page cannot replace a core component',
      );
    },
  );
});

const listDetail = (slots: WireNode['slots']): WireNode => ({
  type: 'ListDetail',
  key: 'issues',
  props: {},
  children: [],
  slots,
});

describe("a root-only part in a root part's slot", () => {
  it('stays where the root names it, as the detail Page', () => {
    const root = listDetail({ detail: [page] });

    expect(prepareWireTree(root, currentPartVersions).slots.detail).toEqual([
      page,
    ]);
  });

  it('is refused as the root itself when ListDetail is nested', () => {
    const root = host('Stack', { direction: 'column' });
    const nested = { ...root, children: [listDetail({ detail: [page] })] };

    expect(
      prepareWireTree(nested, currentPartVersions).children.at(0)?.type,
    ).toBe('Text');
  });
});
