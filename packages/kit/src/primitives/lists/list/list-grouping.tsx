import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ContextType,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  ListContext,
  listSelection,
  type ListSelection,
  type ListPosition,
} from '../../../list-context';
import type { ListChild } from './list-children';
import { ListGroupEnds, ListGroupEndsContext } from './list-group-ends';
import { GroupedCells } from './list-grouped-cell';
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
  value: ContextType<typeof ListContext>;
  cell: boolean;
  position: ListPosition;
};

function useDataRow(index: number, part?: boolean): DataRow {
  const { cell, positionAt } = useContext(RowLayoutContext);

  const position = positionAt(index);

  const value = useMemo(() => ({ position, index }), [position, index]);

  return { value, cell: cell && !part, position };
}

export function DataListRow(props: DataRowProps): ReactElement {
  const { value, cell, position } = useDataRow(props.index, props.part);

  return (
    <ListContext value={value}>
      <GroupedCells cell={cell} position={position}>
        {props.children}
      </GroupedCells>
    </ListContext>
  );
}

const fixedValue = (
  parent: ContextType<typeof ListContext>,
  { item }: FixedRowProps,
): ContextType<typeof ListContext> => ({
  ...parent,
  position: item.position,
  inList: true,
  ...listSelection(item),
});

export function FixedListRow(props: FixedRowProps): ReactElement {
  const value = fixedValue(useContext(ListContext), props);

  return (
    <ListContext value={value}>
      <GroupedCells cell={!props.item.fullSpan} position={props.item.position}>
        {props.item.content}
      </GroupedCells>
    </ListContext>
  );
}

// The renderer List hands its data list for fixed children, which draw their own cells.
export const childRenderer = (item: ListChild): ReactElement => (
  <FixedListRow item={item} />
);

export function SectionListRow(props: SectionRowProps): ReactElement {
  const { section, index, count, children } = props;
  const parent = useContext(ListContext);
  const selection = section.selectionMode ? listSelection(section) : parent;

  const value = {
    ...parent,
    ...selection,
    index,
    position: rowPosition(index, count),
  };

  return <ListContext value={value}>{children}</ListContext>;
}
