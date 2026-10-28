import type { LegendListRef } from '@legendapp/list/react-native';
import type { ReactElement, ReactNode, Ref } from 'react';
import { useWindowDimensions } from 'react-native';
import { useListLook } from '../../../list-look-context';
import { childIdentity } from './list-child-identity';
import { drawsLanes, usePreparedChildren } from './list-children';
import { childrenOptions, type ChildrenOptions } from './list-children-options';
import { ListEmpty } from './list-data';
import { DataList } from './list-data-list';
import { childRenderer } from './list-grouping';
import { ListKeyboard } from './list-keyboard';
import { SectionLanes } from './list-lanes';
import { MovableList } from './list-moves';
import type { ListProps } from './list-props';
import type { ListBlock } from './list-section-model';
import { SectionShelves, type ChildDataProps } from './list-section-shelves';
import type { MoveAnswer } from './list-shown-moves';

interface Prepared {
  items: readonly unknown[];
  shelves: boolean;
  lanes: boolean;
}

const drawsNothing = ({ items, shelves, lanes }: Prepared): boolean =>
  items.length === 0 && !shelves && !lanes;

function ChildrenList({ children, ...props }: ChildrenOptions): ReactElement {
  const prepared = usePreparedChildren({ children, ...props });
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

function ChildDataList({
  blocks,
  shelves,
  lanes,
  ...props
}: Omit<ChildDataProps, 'renderItem'> & {
  blocks: ListBlock[];
  shelves: boolean;
  lanes: boolean;
}): ReactElement {
  if (lanes) return <SectionLanes blocks={blocks} />;

  if (shelves)
    return <SectionShelves {...props} {...childDrawing} blocks={blocks} />;

  return <DataList {...props} {...childDrawing} />;
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

type Render = (children: ReactNode, ref: Ref<LegendListRef>) => ReactElement;

// The List's rows, in the order they show, on the scroll view the drag scrolls.
const rowsIn =
  (options: ChildrenOptions): Render =>
  (children, ref) => (
    <ListKeyboard fit={options.fit}>
      <ChildrenList {...options} ref={ref}>
        {children}
      </ChildrenList>
    </ListKeyboard>
  );

interface MovableProps<Item> {
  list: ListProps<Item>;
  listRef: ListProps<Item>['ref'];
  onMove: MoveAnswer;
}

function MovableRows<Item>(props: MovableProps<Item>): ReactElement {
  const { list, listRef, onMove } = props;
  const lanes = drawsLanes(list.layout, useListLook());

  return (
    <MovableList
      onMove={onMove}
      lanes={lanes}
      listRef={listRef}
      render={rowsIn(childrenOptions(list))}
    >
      {list.children}
    </MovableList>
  );
}

// A List of children: with `onMove`, rows that move.
export function ChildRows<Item>(props: ListProps<Item>): ReactElement {
  const { ref, onMove } = props;

  if (!onMove) return <PlainRows {...props} />;

  return <MovableRows list={props} listRef={ref} onMove={onMove} />;
}

const childDrawing: Pick<
  ChildDataProps,
  'keyExtractor' | 'fullSpan' | 'getItemType' | 'renderItem'
> = { ...childIdentity, renderItem: childRenderer };

function childAnchor(anchor: ListProps<never>['anchor']): true | undefined {
  return anchor === 'end' ? true : undefined;
}
