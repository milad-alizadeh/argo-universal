import { use, type ReactElement, type ReactNode } from 'react';
import { Platform, Pressable, View, type PressableProps } from 'react-native';
import { cn } from '#lib/generic/utils';
import { ContextActions } from '#primitives/actions/action-list';
import {
  useMarkHighlight,
  useSelectedHighlight,
} from '#primitives/lists/list-item';
import { ListContext, type ListPosition } from '../../../list-context';
import { useSeparatorCovered } from '../../../row-highlights';
import { GridCell } from './table-cell';
import type { TableProps } from './table-props';
import { cellOf, type TableRow } from './table-rows';
import { isSelected, rowPress } from './table-selection';

export type GridProps = TableProps & {
  rows: readonly TableRow[];
};

type RowProps = GridProps & { row: TableRow };

// One row of the grid, drawn with List's highlights, selection, separators and ActionList.
export function GridRow(props: RowProps): ReactElement {
  const selected = props.selectionMode
    ? isSelected(props, props.row.id)
    : undefined;

  useSelectedHighlight(selected);

  return (
    <View className="relative">
      <ContextActions actions={props.row.actions}>
        <RowPress {...props} selected={selected} />
      </ContextActions>
      {selected ? <SelectedTint /> : null}
      <RowSeparator />
    </View>
  );
}

function SelectedTint(): ReactElement {
  return (
    <View
      pointerEvents="none"
      aria-hidden
      className="absolute inset-0 bg-selected"
    />
  );
}

const rowClass = cn(
  'flex-row items-center gap-4 p-3 web:select-none web:hover:bg-hover web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:-outline-offset-2',
  Platform.OS !== 'android' && 'active:bg-pressed',
);

// List's hover and press marks, so a row hides the separators beside it.
function useRowMarks(): Pick<
  PressableProps,
  'onHoverIn' | 'onHoverOut' | 'onPressIn' | 'onPressOut'
> {
  const mark = useMarkHighlight();

  return {
    onHoverIn: () => mark('hover', true),
    onHoverOut: () => mark('hover', false),
    onPressIn: () => mark('press', true),
    onPressOut: () => mark('press', false),
  };
}

function RowPress(props: RowProps & { selected?: boolean }): ReactElement {
  const onPress = rowPress(props, props.row);
  const press = { onPress, disabled: !onPress, ...useRowMarks() };

  return (
    <Pressable
      role="row"
      accessibilityLabel={props.row.accessibilityLabel}
      aria-selected={props.selected}
      {...press}
      className={rowClass}
    >
      <RowCells {...props} />
    </Pressable>
  );
}

function RowCells({ columns, row }: RowProps): ReactNode {
  return columns.map((column, index) => (
    <GridCell
      key={column.id}
      column={column}
      first={index === 0}
      cell={cellOf(row, column)}
    />
  ));
}

const isLast = (position: ListPosition): boolean =>
  position === 'last' || position === 'only';

// Inset with the cells, and hidden beside a hovered, pressed or selected row, as List's are.
function RowSeparator(): ReactNode {
  const { position, highlights, index } = use(ListContext);
  const covered = useSeparatorCovered(highlights, index);

  return isLast(position) || covered ? null : (
    <View
      aria-hidden
      className="absolute bottom-0 left-3 right-3 h-px bg-border"
    />
  );
}
