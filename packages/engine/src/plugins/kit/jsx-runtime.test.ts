import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { jsx } from './jsx-runtime';

const isSlot = (child: ReactNode): child is ReactElement<{ argoKey: string }> =>
  isValidElement(child) && child.type === '#slot';

// The names of the Slots an element carries, as the `#slot` nodes its children hold.
const slotNames = (element: ReactNode): string[] =>
  isValidElement<{ children: ReactNode }>(element)
    ? [element.props.children]
        .flat()
        .filter(isSlot)
        .map((slot) => slot.props.argoKey)
    : [];

describe('a named Slot passed empty', () => {
  it.each([
    ['List', 'actions'],
    ['List', 'header'],
    ['EmptyState', 'action'],
    ['ListItem', 'trailing'],
  ])('stays a Slot on %s as %s', (part, slot) => {
    expect(slotNames(jsx(part, { [slot]: [] }))).toEqual([slot]);
  });

  it('leaves an empty array on a prop that is not a Slot as data', () => {
    expect(slotNames(jsx('List', { selected: [] }))).toEqual([]);
  });
});
