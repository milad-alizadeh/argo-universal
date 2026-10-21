import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  ListContext,
  type ListSelection,
  type ListAppearance,
  type ListPosition,
} from '../../../list-context';
import type { ListChild } from './list-children';
import { ListGroupEnds, ListGroupEndsContext } from './list-group-ends';
import type { ListProps } from './list-props';
import { dataRowPosition, rowPosition } from './list-row-position';

type RowLayout = {
  appearance: ListAppearance;
  positionAt: (index: number) => ListPosition;
};

const emptyLayout: RowLayout = {
  appearance: 'plain',
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
    appearance: list.appearance ?? 'plain',
    positionAt: (index) => dataRowPosition(list, index),
  };
}

// Data rows start their own context. Fixed children and standalone Sections adapt it below.
type DataRowProps = {
  index: number;
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

export function DataListRow({ index, children }: DataRowProps): ReactElement {
  const { appearance, positionAt } = useContext(RowLayoutContext);
  const position = positionAt(index);

  const value = useMemo(
    () => ({ appearance, position, index }),
    [appearance, position, index],
  );

  return <ListContext value={value}>{children}</ListContext>;
}

export function FixedListRow({
  item,
  appearance,
}: FixedRowProps): ReactElement {
  const parent = useContext(ListContext);

  const value = {
    ...parent,
    appearance: appearance ?? 'plain',
    position: item.position,
    inList: true,
    ...selectionOf(item),
  };

  return <ListContext value={value}>{item.content}</ListContext>;
}

export function SectionListRow(props: SectionRowProps): ReactElement {
  const { section, index, count, children } = props;
  const parent = useContext(ListContext);
  const selection = section.selectionMode ? selectionOf(section) : parent;

  const value = {
    ...parent,
    ...selection,
    index,
    position: rowPosition(index, count),
  };

  return <ListContext value={value}>{children}</ListContext>;
}

// Copying undefined selection fields deliberately clears inherited selection for a fixed child.
const selectionOf = (selection: ListSelection): ListSelection => ({
  selectionMode: selection.selectionMode,
  selection: selection.selection,
  onSelectionChange: selection.onSelectionChange,
});
