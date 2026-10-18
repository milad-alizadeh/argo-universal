import { createContext } from 'react';

export type ListAppearance = 'plain' | 'grouped' | 'cards';

export type ListPosition = 'only' | 'first' | 'middle' | 'last';

export const ListContext = createContext<{
  appearance: ListAppearance;
  position: ListPosition;
  selectionMode?: 'single';
}>({ appearance: 'plain', position: 'only' });

const positions = {
  'true-true': 'only',
  'true-false': 'first',
  'false-false': 'middle',
  'false-true': 'last',
} satisfies Record<`${boolean}-${boolean}`, ListPosition>;

export const listPosition = (first: boolean, last: boolean): ListPosition =>
  positions[`${first}-${last}`];
