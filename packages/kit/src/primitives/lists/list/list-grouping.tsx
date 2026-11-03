import {
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  ListSelectionContext,
  RowPositionContext,
  listSelection,
  type ListSelection,
  type ListPosition,
  type RowPosition,
} from '../../../list-context';
import { useListLook } from '../../../list-look-context';
import type { ListChild } from './list-children';
import { fieldRowMoves } from './list-field-row-moves';
import { ListGroupEnds, ListGroupEndsContext } from './list-group-ends';
import { groupedCell } from './list-grouped-cell';
import { movableRow } from './list-movable-row';
import { useListMoves } from './list-move-context';
import type { ListProps } from './list-props';
import { RowLayoutContext, useRowLayout } from './list-row-layout';
import { rowPosition } from './list-row-position';

export function ListGrouping<Item>({
  children,
  list,
}: {
  children: ReactNode;
  list?: ListProps<Item>;
}): ReactElement {
  const [ends] = useState(() => new ListGroupEnds());
  const layout = useRowLayout(list, list?.renderItem !== childRenderer);

  return (
    <RowLayoutContext value={layout}>
      <ListGroupEndsContext value={ends}>{children}</ListGroupEndsContext>
    </RowLayoutContext>
  );
}

// Data rows start their own context. Fixed children and standalone Sections adapt it below.
type FixedRowProps = {
  item: ListChild;
};

type SectionRowProps = {
  section: ListSelection;
  index: number;
  count: number;
  children: ReactNode;
};

// Where a data row sits, and whether it draws its piece of a web grouped section's card.
export type DataRow = {
  value: RowPosition;
  cell: boolean;
  position: ListPosition;
};

// `part` is a heading, footer or gap the caller draws: not a row of the card.
export function useDataRow(index: number, part: boolean): DataRow {
  const { cell, positionAt } = useContext(RowLayoutContext);
  const { webGrouped } = useListLook();

  const position = positionAt(index);

  const value = useMemo(() => ({ position, index }), [position, index]);

  return { value, cell: webGrouped && cell && !part, position };
}

// A data row chooses nothing a section or List around its List chose: its List's own selection reaches it by row id.
const noSelection: ListSelection = {};

// A plain function for the List's own row, so a data row is no deeper than what it draws.
export const dataListRow = (
  row: DataRow,
  children: ReactNode,
): ReactElement => (
  <ListSelectionContext value={noSelection}>
    <RowPositionContext value={row.value}>
      {groupedCell(row.cell, row.position, children)}
    </RowPositionContext>
  </ListSelectionContext>
);

function useFixedPosition({ position }: ListChild): RowPosition {
  const { index } = useContext(RowPositionContext);

  return useMemo(() => ({ index, position }), [index, position]);
}

// A fixed child's cell, drawn by its row itself so the row is no deeper than what it draws.
const fixedCell = (
  item: ListChild,
  moves: ReturnType<typeof useListMoves>,
  grouped: boolean,
): ReactNode =>
  movableRow(moves, {
    id: item.moveId,
    ghost: item.content,
    children: groupedCell(
      grouped && !item.fullSpan,
      item.position,
      fieldRowMoves({ id: item.moveId, content: item.content }),
    ),
  });

function FixedListRow({ item }: FixedRowProps): ReactElement {
  const position = useFixedPosition(item);
  const moves = useListMoves();
  const { webGrouped } = useListLook();

  return (
    <ListSelectionContext value={listSelection(item)}>
      <RowPositionContext value={position}>
        {fixedCell(item, moves, webGrouped)}
      </RowPositionContext>
    </ListSelectionContext>
  );
}

// The renderer List hands its data list for fixed children, which draw their own cells.
export const childRenderer = (item: ListChild): ReactElement => (
  <FixedListRow item={item} />
);

export function SectionListRow(props: SectionRowProps): ReactElement {
  const { section, index, count, children } = props;
  const parent = useContext(ListSelectionContext);
  const selection = section.selectionMode ? listSelection(section) : parent;
  const position = { index, position: rowPosition(index, count) };

  return (
    <ListSelectionContext value={selection}>
      <RowPositionContext value={position}>{children}</RowPositionContext>
    </ListSelectionContext>
  );
}
