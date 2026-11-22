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
    expect(tree).toHaveProperty('children.length', 15);
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

    expect(tree?.children[1]?.children).toHaveLength(15);
  });

  it('keeps data whose name only starts with "on"', () => {
    const tree = loadingTree(
      node('Pill', 'state', { props: { ongoing: true, onPress: {} } }),
    );

    expect(tree.props).toEqual({ ongoing: true });
  });

  it('keeps a Fader as its empty shell, without its level, fill or what it holds', () => {
    const tree = loadingTree(
      node('Fader', 'light:desk', {
        props: {
          orientation: 'horizontal',
          value: 40,
          valueLabel: '40%',
          fill: ['warm', 'warmer'],
          minimumValue: 1,
          maximumValue: 100,
          onValueChange: { operation: 'setBrightness', args: {} },
        },
        children: [
          node('Text', 'title', { props: { children: 'Desk lamp' } }),
          node('IconButton', 'power', { props: { icon: 'power' } }),
        ],
      }),
    );

    expect(tree).toEqual(
      node('Fader', 'light:desk', {
        props: {
          orientation: 'horizontal',
          minimumValue: 1,
          maximumValue: 100,
        },
      }),
    );
  });

  it('leaves out an Inspector, open or not', () => {
    const tree = loadingTree(
      node('Stack', 'page', {
        children: [
          node('Text', 'title'),
          node('Inspector', 'scenes', {
            props: { open: true, title: 'Scenes' },
          }),
        ],
      }),
    );

    expect(tree.children.map(({ type }) => type)).toEqual(['Text']);
  });
});
