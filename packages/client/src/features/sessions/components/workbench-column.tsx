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

// The cards share one panel, a hairline between each and the next, as a grouped list parts its rows.
function CardDivider({ shown }: { shown: boolean }): ReactElement | null {
  if (!shown) return null;

  return <View role="separator" className="h-px bg-hairline" />;
}

export function WorkbenchColumn({ cards }: Props): ReactElement {
  const column = useRef<ComponentRef<typeof View>>(null);
  const reorder = useWorkbenchReorder(cards, column);

  return (
    <View ref={column} testID="session-workbench">
      {reorder.cards.map((card, index) => (
        <View key={card.id} {...reorder.slot(card.id)}>
          <CardDivider shown={index > 0} />
          {card.render(reorder.handle(card.id, card.label))}
        </View>
      ))}
    </View>
  );
}
