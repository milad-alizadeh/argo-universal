import { createElement, isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { closingActions } from './list-selection-actions';

interface ItemProps {
  onPress?: () => string;
  children?: ReactNode;
}

function Item(_props: ItemProps): null {
  return null;
}

function pressOf(node: ReactNode): (() => string) | undefined {
  return isValidElement<ItemProps>(node) ? node.props.onPress : undefined;
}

function nodesOf(node: ReactNode): ReactNode[] {
  return Array.isArray(node) ? node : [node];
}

describe('closingActions', () => {
  it('runs the Action first, returns what it returned, then closes', () => {
    const calls: string[] = [];

    const [node] = nodesOf(
      closingActions(
        createElement(Item, {
          key: 'archive',
          onPress: () => {
            calls.push('press');

            return 'done';
          },
        }),
        () => calls.push('close'),
      ),
    );

    expect(pressOf(node)?.()).toBe('done');
    expect(calls).toEqual(['press', 'close']);
  });

  it('leaves the selection open when the press throws', () => {
    const calls: string[] = [];

    const [node] = nodesOf(
      closingActions(
        createElement(Item, {
          key: 'archive',
          onPress: () => {
            throw new Error('refused');
          },
        }),
        () => calls.push('close'),
      ),
    );

    expect(() => pressOf(node)?.()).toThrow('refused');
    expect(calls).toEqual([]);
  });

  it('closes after an Action nested in a Section or submenu', () => {
    const calls: string[] = [];

    const inner = createElement(Item, {
      key: 'inner',
      onPress: () => 'inner',
    });

    const [section] = nodesOf(
      closingActions(createElement(Item, { key: 'section' }, inner), () =>
        calls.push('close'),
      ),
    );

    const [nested] = nodesOf(
      isValidElement<ItemProps>(section) ? section.props.children : null,
    );

    expect(pressOf(section)).toBeUndefined();
    expect(pressOf(nested)?.()).toBe('inner');
    expect(calls).toEqual(['close']);
  });

  it('returns nothing for no Actions', () => {
    expect(closingActions(undefined, () => {})).toBeUndefined();
  });
});
