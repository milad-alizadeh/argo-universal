import { type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  RowPositionContext,
  listPosition,
  type RowPosition,
} from '../../../list-context';
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

const rowPosition = (index: number, count: number): RowPosition => ({
  index,
  position: listPosition(index === 0, index === count - 1),
});

function GridRows(props: GridProps): ReactNode {
  return (
    <RowHighlightProvider>
      {props.rows.map((row, index) => (
        <RowPositionContext
          key={row.key}
          value={rowPosition(index, props.rows.length)}
        >
          <GridRow {...props} row={row} />
        </RowPositionContext>
      ))}
    </RowHighlightProvider>
  );
}
