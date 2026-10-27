import type { KitSchemaProps } from '@repo/contracts/kit-props';
import { createContext } from 'react';

export type ListAppearance = NonNullable<KitSchemaProps['List']['appearance']>;

export type ListDensity = NonNullable<KitSchemaProps['List']['density']>;

export type ListPosition = 'only' | 'first' | 'middle' | 'last';

export interface ListSelection {
  selectionMode?: 'single' | 'multiple';
  selection?: readonly string[];
  onSelectionChange?: (selection: readonly string[]) => void;
}

export const ListContext = createContext<
  ListSelection & {
    position: ListPosition;
    // Set inside a List's own rows, so a part that would draw its own List draws a section instead.
    inList?: boolean;
    // The row's place among its List's rows, for the separators a pressed neighbour covers.
    index?: number;
  }
>({ position: 'only' });

const positions = {
  'true-true': 'only',
  'true-false': 'first',
  'false-false': 'middle',
  'false-true': 'last',
} satisfies Record<`${boolean}-${boolean}`, ListPosition>;

export const listPosition = (first: boolean, last: boolean): ListPosition =>
  positions[`${first}-${last}`];

// Undefined fields deliberately clear inherited selection for a fixed child.
export const listSelection = (selection: ListSelection): ListSelection => ({
  selectionMode: selection.selectionMode,
  selection: selection.selection,
  onSelectionChange: selection.onSelectionChange,
});

export const ListTileContext = createContext<{ aspect: number } | null>(null);
