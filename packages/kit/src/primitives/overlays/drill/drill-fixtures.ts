import type { DrillProps } from './drill-props';

// The value and the choices are state the example holds, so a fixture leaves them out.
type DrillFixture = Omit<DrillProps, 'children' | 'value'>;

export const fruitDrill = {
  label: 'Fruit',
  title: 'Select Fruit',
  contentScrolls: true,
} satisfies DrillFixture;
