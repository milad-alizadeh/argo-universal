import { listDefaults } from '@repo/contracts/kit-tokens';
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
  type ListAppearance,
  type ListPosition,
} from '../../../list-context';
import { childRenderers } from './list-child-renderers';
import type { ListChild } from './list-children';
import { ListGroupEnds, ListGroupEndsContext } from './list-group-ends';
import { GroupedCells } from './list-grouped-cell';
import type { ListProps } from './list-props';
import { dataRowPosition, rowPosition } from './list-row-position';

type RowLayout = {
  appearance: ListAppearance;
  // The appearance a data row draws its card piece in; a fixed child draws its own cell.
  cellAppearance: ListAppearance;
  positionAt: (index: number) => ListPosition;
};

const emptyLayout: RowLayout = {
  appearance: 'plain',
  cellAppearance: 'plain',
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

const dataCellAppearance = <Item,>(
  list: ListProps<Item>,
  appearance: ListAppearance,
): ListAppearance =>
  childRenderers.has(list.renderItem ?? {}) ? 'plain' : appearance;

function rowLayout<Item>(list: ListProps<Item> | undefined): RowLayout {
  if (!list) return emptyLayout;

  const appearance = list.appearance ?? listDefaults.appearance;

  return {
    appearance,
    cellAppearance: dataCellAppearance(list, appearance),
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
  appearance: ListProps<never>['appearance'];
};

type SectionRowProps = {
  section: ListSelection;
  index: number;
  count: number;
  children: ReactNode;
};

type DataRow = {
  value: ContextType<typeof ListContext>;
  cellAppearance: ListAppearance;
  position: ListPosition;
};

function useDataRow(index: number, part?: boolean): DataRow {
  const { appearance, cellAppearance, positionAt } =
    useContext(RowLayoutContext);

  const position = positionAt(index);

  const value = useMemo(
    () => ({ appearance, position, index }),
    [appearance, position, index],
  );

  return {
    value,
    cellAppearance: part ? 'plain' : cellAppearance,
    position,
  };
}

export function DataListRow(props: DataRowProps): ReactElement {
  const { value, cellAppearance, position } = useDataRow(
    props.index,
    props.part,
  );

  return (
    <ListContext value={value}>
      <GroupedCells appearance={cellAppearance} position={position}>
        {props.children}
      </GroupedCells>
    </ListContext>
  );
}

const fixedValue = (
  parent: ContextType<typeof ListContext>,
  { item, appearance }: FixedRowProps,
): ContextType<typeof ListContext> => ({
  ...parent,
  appearance: appearance ?? listDefaults.appearance,
  position: item.position,
  inList: true,
  ...listSelection(item),
});

// A section's header, footer and gap are not rows of its card.
const cellAppearance = ({ item, appearance }: FixedRowProps): ListAppearance =>
  item.fullSpan ? 'plain' : (appearance ?? listDefaults.appearance);

export function FixedListRow(props: FixedRowProps): ReactElement {
  const value = fixedValue(useContext(ListContext), props);

  return (
    <ListContext value={value}>
      <GroupedCells
        appearance={cellAppearance(props)}
        position={props.item.position}
      >
        {props.item.content}
      </GroupedCells>
    </ListContext>
  );
}

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
