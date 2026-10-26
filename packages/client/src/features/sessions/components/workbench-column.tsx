import {
  useRef,
  type ComponentRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import { useWorkbenchReorder } from './use-workbench-reorder';

export interface WorkbenchColumnCard {
  id: string;
  label: string;
  render: (handle: ReactNode) => ReactNode;
}

interface Props {
  cards: readonly WorkbenchColumnCard[];
}

export function WorkbenchColumn({ cards }: Props): ReactElement {
  const column = useRef<ComponentRef<typeof View>>(null);
  const reorder = useWorkbenchReorder(cards, column);

  return (
    <View ref={column} testID="session-workbench" className="gap-2">
      {reorder.cards.map((card) => (
        <View key={card.id} {...reorder.slot(card.id)}>
          {card.render(reorder.handle(card.id, card.label))}
        </View>
      ))}
    </View>
  );
}
