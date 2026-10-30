import {
  createContext,
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
import type { ListChild } from './list-children';
import { FieldRowMoves } from './list-field-row-moves';
import { ListGroupEnds, ListGroupEndsContext } from './list-group-ends';
import { GroupedCells } from './list-grouped-cell';
import { MovableRow } from './list-movable-row';
import type { ListProps } from './list-props';
import { dataRowPosition, rowPosition } from './list-row-position';

type RowLayout = {
  // Whether a data row draws its card piece; a fixed child draws its own cell.
  cell: boolean;
  positionAt: (index: number) => ListPosition;
};

const emptyLayout: RowLayout = {
  cell: false,
  positionAt: () => 'only',
};

const RowLayoutContext = createContext<RowLayout>(emptyLayout);

export function ListGrouping<Item>({
  children,
  list,
}: {
  children: ReactNode;
  list?: ListProps<Item>;
}): ReactElement {
  const [ends] = useState(() => new ListGroupEnds());
  const layout = useMemo(() => rowLayout(list), [list]);

  return (
    <RowLayoutContext value={layout}>
      <ListGroupEndsContext value={ends}>{children}</ListGroupEndsContext>
    </RowLayoutContext>
  );
}

function rowLayout<Item>(list: ListProps<Item> | undefined): RowLayout {
  if (!list) return emptyLayout;

  return {
    cell: list.renderItem !== childRenderer,
    positionAt: (index) => dataRowPosition(list, index),
  };
}

// Data rows start their own context. Fixed children and standalone Sections adapt it below.
type DataRowProps = {
  index: number;
  // A heading, footer or gap the caller draws: not a row of the card.
  part?: boolean;
  children: ReactNode;
};

type FixedRowProps = {
  item: ListChild;
};

type SectionRowProps = {
  section: ListSelection;
  index: number;
  count: number;
  children: ReactNode;
};

type DataRow = {
  value: RowPosition;
  cell: boolean;
  position: ListPosition;
};

function useDataRow(index: number, part?: boolean): DataRow {
  const { cell, positionAt } = useContext(RowLayoutContext);

  const position = positionAt(index);

  const value = useMemo(() => ({ position, index }), [position, index]);

  return { value, cell: cell && !part, position };
}

// A data row chooses nothing a section or List around its List chose: its List's own selection reaches it by row id.
const noSelection: ListSelection = {};

export function DataListRow(props: DataRowProps): ReactElement {
  const { value, cell, position } = useDataRow(props.index, props.part);

  return (
    <ListSelectionContext value={noSelection}>
      <RowPositionContext value={value}>
        <GroupedCells cell={cell} position={position}>
          {props.children}
        </GroupedCells>
      </RowPositionContext>
    </ListSelectionContext>
  );
}

function useFixedPosition({ position }: ListChild): RowPosition {
  const { index } = useContext(RowPositionContext);

  return useMemo(() => ({ index, position }), [index, position]);
}

const FixedCell = ({ item }: FixedRowProps): ReactElement => (
  <MovableRow id={item.moveId} ghost={item.content}>
    <GroupedCells cell={!item.fullSpan} position={item.position}>
      <FieldRowMoves id={item.moveId} content={item.content} />
    </GroupedCells>
  </MovableRow>
);

function FixedListRow({ item }: FixedRowProps): ReactElement {
  const position = useFixedPosition(item);

  return (
    <ListSelectionContext value={listSelection(item)}>
      <RowPositionContext value={position}>
        <FixedCell item={item} />
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
