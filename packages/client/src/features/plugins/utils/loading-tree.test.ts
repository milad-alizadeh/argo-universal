import type { WireNode } from '@repo/contracts/plugins/wire';
import { describe, expect, it } from 'vitest';
import { loadingTree } from './loading-tree';

const node = (
  type: string,
  key: string,
  parts: Partial<Omit<WireNode, 'type' | 'key'>> = {},
): WireNode => ({ type, key, props: {}, slots: {}, children: [], ...parts });

const row = (index: number): WireNode =>
  node('ListItem', `PROJ-${index}`, {
    props: {
      title: `Issue ${index}`,
      subtitle: `PROJ-${index}`,
      onPress: { operation: 'open', args: { index } },
    },
    slots: {
      leading: [node('Icon', 'mark', { props: { name: 'pending' } })],
      meta: [node('Pill', 'status', { props: { text: 'To Do' } })],
      actions: [node('Action', 'open', { props: { label: 'Open in Jira' } })],
    },
  });

const list = (rows: number): WireNode =>
  node('List', 'issues', {
    props: {
      density: 'compact',
      pagination: { hasMore: true, onLoadMore: { loadMore: true } },
      onRefresh: { state: {} },
    },
    children: Array.from({ length: rows }, (_, index) => row(index)),
  });

describe('loadingTree', () => {
  it('keeps the first rows of a List as they were drawn, without what they do', () => {
    const tree = loadingTree(list(40));

    expect(tree).toMatchObject({ props: { density: 'compact' } });
    expect(tree).not.toHaveProperty('props.pagination');
    expect(tree).toHaveProperty('children.length', 12);
    expect(tree).toHaveProperty(
      ['children', 0],
      node('ListItem', 'PROJ-0', {
        props: { title: 'Issue 0', subtitle: 'PROJ-0' },
        slots: {
          leading: [node('Icon', 'mark', { props: { name: 'pending' } })],
          meta: [node('Pill', 'status', { props: { text: 'To Do' } })],
        },
      }),
    );
  });

  it('keeps the first rows of a List inside a Stack', () => {
    const tree = loadingTree(
      node('Stack', 'page', { children: [node('Text', 'title'), list(20)] }),
    );

    expect(tree?.children[1]?.children).toHaveLength(12);
  });

  it('keeps nothing of a page too large to keep', () => {
    const body = node('Text', 'body', {
      props: { text: 'x'.repeat(70_000) },
    });

    expect(loadingTree(body)).toBeNull();
  });
});
