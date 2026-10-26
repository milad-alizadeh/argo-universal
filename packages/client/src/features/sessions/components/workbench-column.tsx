import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useWorkbenchReorder } from './use-workbench-reorder';

// A card the column places: its identity, its name for the handle, and how it draws given that handle.
export interface WorkbenchColumnCard {
  id: string;
  label: string;
  render: (handle: ReactNode) => ReactNode;
}

interface Props {
  cards: readonly WorkbenchColumnCard[];
}

// Places and stacks the cards it is given, 8 apart, and lets a desktop user drag them into another order.
export function WorkbenchColumn({ cards }: Props): ReactElement {
  const reorder = useWorkbenchReorder(cards);

  return (
    <View testID="session-workbench" className="gap-2">
      {reorder.cards.map((card) => (
        <View key={card.id} {...reorder.slot(card.id)}>
          {card.render(reorder.handle(card.id, card.label))}
        </View>
      ))}
    </View>
  );
}
