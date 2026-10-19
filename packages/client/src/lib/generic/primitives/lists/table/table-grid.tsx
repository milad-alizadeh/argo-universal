import {
  use,
  useState,
  type ContextType,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import { ListContext, listPosition } from '../../../list-context';
import {
  createRowHighlights,
  type RowHighlights,
} from '../../../row-highlights';
import { GridRow, type GridProps } from './table-grid-row';
import { TableHeader } from './table-header';

// Regular widths: the column titles on a tint tray over a card of rows, each row with List's hover, selection, separators and ActionList.
export function TableGrid(props: GridProps): ReactElement {
  return (
    <View
      role="table"
      accessibilityLabel={props.accessibilityLabel}
      className="rounded-2xl bg-tint px-1 pb-1"
    >
      <TableHeader {...props} />
      <View className="overflow-hidden rounded-xl bg-card">
        <GridRows {...props} />
      </View>
    </View>
  );
}

type ListContextValue = ContextType<typeof ListContext>;

interface RowPlace {
  highlights: RowHighlights;
  index: number;
  count: number;
}

const rowContext = (
  list: ListContextValue,
  { highlights, index, count }: RowPlace,
): ListContextValue => ({
  ...list,
  highlights,
  index,
  position: listPosition(index === 0, index === count - 1),
});

function GridRows(props: GridProps): ReactNode {
  const [highlights] = useState(createRowHighlights);
  const list = use(ListContext);

  return props.rows.map((row, index) => (
    <ListContext
      key={row.key}
      value={rowContext(list, { highlights, index, count: props.rows.length })}
    >
      <GridRow {...props} row={row} />
    </ListContext>
  ));
}
