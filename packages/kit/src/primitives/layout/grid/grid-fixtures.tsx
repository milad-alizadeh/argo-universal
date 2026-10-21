import type { ComponentProps } from 'react';
import { Text } from '#primitives/content/text';
import { Surface } from '#primitives/layout/surface';
import type { Grid } from './grid';

const summaries = ['One', 'Two', 'Three', 'Four'];

const children = summaries.map((title) => (
  <Surface key={title} kind="card" padding={4}>
    <Text>{title}</Text>
  </Surface>
));

type GridProps = ComponentProps<typeof Grid>;

export const twoColumnsGrid = {
  columns: 2,
  gap: 3,
  children,
} satisfies GridProps;

export const threeColumnsGrid = {
  columns: 3,
  gap: 3,
  children,
} satisfies GridProps;

export const fourColumnsGrid = {
  columns: 4,
  gap: 3,
  children,
} satisfies GridProps;

export const narrowGapGrid = {
  columns: 2,
  gap: 2,
  children,
} satisfies GridProps;

export const wideGapGrid = {
  columns: 2,
  gap: 4,
  children,
} satisfies GridProps;

export const columnsPerSizeClassGrid = {
  columns: { compact: 1, medium: 2, wide: 4 },
  gap: 3,
  children,
} satisfies GridProps;
