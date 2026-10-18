import { createContext } from 'react';

export type ListAppearance = 'plain' | 'grouped' | 'cards';

export type ListPosition = 'only' | 'first' | 'middle' | 'last';

export interface ListSelection {
  selectionMode?: 'single' | 'multiple';
  selection?: readonly string[];
  onSelectionChange?: (selection: string[]) => void;
}

export const ListContext = createContext<
  ListSelection & {
    appearance: ListAppearance;
    position: ListPosition;
  }
>({ appearance: 'plain', position: 'only' });

const positions = {
  'true-true': 'only',
  'true-false': 'first',
  'false-false': 'middle',
  'false-true': 'last',
} satisfies Record<`${boolean}-${boolean}`, ListPosition>;

export const listPosition = (first: boolean, last: boolean): ListPosition =>
  positions[`${first}-${last}`];
