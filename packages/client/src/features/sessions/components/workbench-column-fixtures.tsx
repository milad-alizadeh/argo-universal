import { Text } from '@repo/kit/primitives/content/text';
import { Card } from '@repo/kit/primitives/layout/card';
import type { ReactNode } from 'react';
import type { WorkbenchColumnCard } from './workbench-column';

const plate =
  (title: string, body: string) =>
  (handle: ReactNode): ReactNode => (
    <Card kind="glass" collapsible defaultOpen title={title} actions={handle}>
      <Text tone="muted">{body}</Text>
    </Card>
  );

// The column places whatever cards it is given; these three only need to differ in height and name.
const firstCard = {
  id: 'first',
  label: 'First',
  render: plate('First', 'One line.'),
} satisfies WorkbenchColumnCard;

export const threeCards = [
  firstCard,
  {
    id: 'second',
    label: 'Second',
    render: plate(
      'Second',
      'A body of two lines, so the cards differ in height.',
    ),
  },
  { id: 'third', label: 'Third', render: plate('Third', 'Another body.') },
] satisfies WorkbenchColumnCard[];

export const oneCard = [firstCard] satisfies WorkbenchColumnCard[];
