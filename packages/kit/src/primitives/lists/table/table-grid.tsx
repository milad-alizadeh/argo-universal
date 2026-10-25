import {
  use,
  type ContextType,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import { ListContext, listPosition } from '../../../list-context';
import { RowHighlightProvider } from '../../../row-highlights';
import { trayCardClassName, trayClassName } from '../../../tray-surface';
import { GridRow, type GridProps } from './table-grid-row';
import { TableHeader } from './table-header';

// Regular widths: the column titles on a tint tray over a card of rows, each row with List's press, selection, separators and Actions.
export function TableGrid(props: GridProps): ReactElement {
  return (
    <View
      role="table"
      accessibilityLabel={props.accessibilityLabel}
      className={trayClassName}
    >
      <TableHeader {...props} />
      <View className={trayCardClassName}>
        <GridRows {...props} />
      </View>
    </View>
  );
}

type ListContextValue = ContextType<typeof ListContext>;

const rowContext = (
  list: ListContextValue,
  index: number,
  count: number,
): ListContextValue => ({
  ...list,
  index,
  position: listPosition(index === 0, index === count - 1),
});

function GridRows(props: GridProps): ReactNode {
  const list = use(ListContext);

  return (
    <RowHighlightProvider>
      {props.rows.map((row, index) => (
        <ListContext
          key={row.key}
          value={rowContext(list, index, props.rows.length)}
        >
          <GridRow {...props} row={row} />
        </ListContext>
      ))}
    </RowHighlightProvider>
  );
}
