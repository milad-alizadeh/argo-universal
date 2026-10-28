import type { ListProps } from './list-props';

export interface BoardCard {
  id: string;
  title: string;
}

export interface BoardLane {
  id: string;
  title: string;
  rows: readonly BoardCard[];
}

const card = (id: string, title: string): BoardCard => ({ id, title });

// Placeholder lanes: a board's Sections, each holding cards as its rows.
export const boardLanes: readonly BoardLane[] = [
  {
    id: 'first',
    title: 'First',
    rows: [
      card('alpha', 'Alpha'),
      card('beta', 'Beta'),
      card('gamma', 'Gamma'),
    ],
  },
  { id: 'second', title: 'Second', rows: [card('delta', 'Delta')] },
  { id: 'third', title: 'Third', rows: [] },
];

// What the examples vary: a List of Sections draws as a board or a column.
export type MovesProps = Pick<
  ListProps<never>,
  'layout' | 'appearance' | 'accessibilityLabel'
>;

export const board = {
  layout: 'lanes',
  appearance: 'cards',
  accessibilityLabel: 'Board',
} satisfies MovesProps;

export const column = {
  accessibilityLabel: 'Sorted items',
} satisfies MovesProps;
