import { use, type ReactElement, type ReactNode } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { tintTransitionClassName } from '#kit/motion';
import { cn } from '#kit/utils';
import { ContextActions } from '#primitives/actions/action';
import { RowPositionContext, type ListPosition } from '../../../list-context';
import type { ListLook } from '../../../list-look';
import { useListLook } from '../../../list-look-context';
import { useRowHighlight, useSeparatorCovered } from '../../../row-highlights';
import { GridCell } from './table-cell';
import type { TableProps } from './table-props';
import { cellOf, type TableRow } from './table-rows';
import { isSelected, rowPress } from './table-selection';

export type GridProps = TableProps & {
  rows: readonly TableRow[];
};

type RowProps = GridProps & { row: TableRow };

// One row of the grid, drawn with List's press, selection, separators and Actions.
export function GridRow(props: RowProps): ReactElement {
  const selected = props.selectionMode
    ? isSelected(props, props.row.id)
    : undefined;

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

// Cells start on one line, whatever each holds: a wrapping cell grows down, it does not push its row's text off-centre.
const rowClass = (look: ListLook): string =>
  cn(
    'flex-row items-start gap-4 p-3 web:select-none web:hover:bg-hover web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:-outline-offset-2',
    !look.ripple && 'active:bg-pressed',
    tintTransitionClassName,
  );

function usePressProps(props: RowProps): PressableProps {
  const onPress = rowPress(props, props.row);

  return {
    onPress,
    disabled: !onPress,
    className: rowClass(useListLook()),
    ...useRowHighlight(),
  };
}

function RowPress(props: RowProps & { selected?: boolean }): ReactElement {
  const press = usePressProps(props);

  return (
    <Pressable
      role="row"
      accessibilityLabel={props.row.accessibilityLabel}
      aria-selected={props.selected}
      {...press}
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

// Inset with the cells, and hidden beside an iOS press, as List's are.
function RowSeparator(): ReactNode {
  const { position, index } = use(RowPositionContext);
  const covered = useSeparatorCovered(index);

  return isLast(position) || covered ? null : (
    <View
      aria-hidden
      className="absolute bottom-0 left-3 right-3 h-px bg-border"
    />
  );
}
