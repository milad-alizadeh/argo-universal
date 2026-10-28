import type { ReactElement, Ref } from 'react';
import { useWindowDimensions } from 'react-native';
import type { ListRef } from '../../../list-ref';
import { childIdentity } from './list-child-identity';
import { usePreparedChildren, type PreparedChildren } from './list-children';
import { childrenOptions, type ChildrenOptions } from './list-children-options';
import { ListEmpty } from './list-data';
import { DataList } from './list-data-list';
import { childRenderer } from './list-grouping';
import { ListKeyboard } from './list-keyboard';
import { SectionLanes } from './list-lanes';
import { useMovableReading } from './list-movable-reading';
import type { MoveAnswer } from './list-move-order';
import { MovableList } from './list-moves';
import type { ListProps } from './list-props';
import { SectionShelves, type ChildDataProps } from './list-section-shelves';

const drawsNothing = ({ items, shelves, lanes }: PreparedChildren): boolean =>
  items.length === 0 && !shelves && !lanes;

interface PreparedListProps extends Omit<ChildrenOptions, 'children'> {
  prepared: PreparedChildren;
}

function PreparedList({ prepared, ...props }: PreparedListProps): ReactElement {
  // Fixed children can live inside a scrolling page without a bounded flex height.
  const { height } = useWindowDimensions();

  if (drawsNothing(prepared)) return <ListEmpty {...props} />;

  return (
    <ChildDataList
      {...props}
      {...prepared}
      maxHeight={childMaxHeight(props, height)}
      maintainVisibleContentPosition={childAnchor(props.anchor)}
    />
  );
}

function ChildrenList({ children, ...options }: ChildrenOptions): ReactElement {
  const prepared = usePreparedChildren({ ...options, children });

  return <PreparedList {...options} prepared={prepared} />;
}

type ChildDataListProps = Omit<ChildDataProps, 'renderItem'> &
  Omit<PreparedChildren, 'items'>;

// A plain List draws its rows, not its blocks.
const rowsOf = ({
  blocks: _blocks,
  looseKey: _looseKey,
  ...rows
}: Omit<ChildDataListProps, 'shelves' | 'lanes'>): Omit<
  ChildDataProps,
  'renderItem'
> => rows;

// Lanes and shelves draw the List's blocks; a plain List draws its rows.
function ChildDataList({
  shelves,
  lanes,
  ...props
}: ChildDataListProps): ReactElement {
  if (lanes) return <SectionLanes {...props} {...childDrawing} />;

  if (shelves) return <SectionShelves {...props} {...childDrawing} />;

  return <DataList {...rowsOf(props)} {...childDrawing} />;
}

function childMaxHeight(
  props: ChildrenOptions,
  height: number,
): ListProps<never>['maxHeight'] {
  if (props.fit === false) return props.maxHeight;

  return props.maxHeight ?? height;
}

function PlainRows<Item>(props: ListProps<Item>): ReactElement {
  return (
    <ListKeyboard fit={props.fit}>
      <ChildrenList {...childrenOptions(props)} />
    </ListKeyboard>
  );
}

type Render = (ref: Ref<ListRef>) => ReactElement;

// The List's rows, in the order they show, on the scroll view the drag scrolls.
const rowsIn =
  (
    { children: _children, ...options }: ChildrenOptions,
    prepared: PreparedChildren,
  ): Render =>
  (ref) => (
    <ListKeyboard fit={options.fit}>
      <PreparedList {...options} prepared={prepared} ref={ref} />
    </ListKeyboard>
  );

interface MovableProps<Item> {
  list: ListProps<Item>;
  listRef: ListProps<Item>['ref'];
  onMove: MoveAnswer;
}

function MovableRows<Item>(props: MovableProps<Item>): ReactElement {
  const options = childrenOptions(props.list);
  const { prepared, order } = useMovableReading(options, props.onMove);

  return (
    <MovableList
      order={order}
      lanes={prepared.lanes}
      listRef={props.listRef}
      render={rowsIn(options, prepared)}
    />
  );
}

// Rows move in a column or lanes: a grid or shelf flows its rows where no drag measures them.
const flows = ({
  layout,
  direction,
}: Pick<ListProps<never>, 'layout' | 'direction'>): boolean =>
  layout === 'grid' || direction === 'horizontal';

// A List of children: with `onMove`, rows that move.
export function ChildRows<Item>(props: ListProps<Item>): ReactElement {
  const { ref, onMove } = props;

  if (!onMove || flows(props)) return <PlainRows {...props} />;

  return <MovableRows list={props} listRef={ref} onMove={onMove} />;
}

const childDrawing: Pick<
  ChildDataProps,
  'keyExtractor' | 'fullSpan' | 'getItemType' | 'renderItem'
> = { ...childIdentity, renderItem: childRenderer };

function childAnchor(anchor: ListProps<never>['anchor']): true | undefined {
  return anchor === 'end' ? true : undefined;
}
