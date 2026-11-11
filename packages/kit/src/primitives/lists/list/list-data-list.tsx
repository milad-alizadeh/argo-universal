import type { ReactElement } from 'react';
import { useListLook } from '../../../list-look-context';
import { RowHighlightProvider } from '../../../row-highlights';
import { ScrollFadeList } from '../../../scroll-fade/scroll-fade-list';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import {
  ListEmpty,
  useRenderedRows,
  useListPadding,
  useRowGutter,
} from './list-data';
import { ListGrouping } from './list-grouping';
import { useScrollProps } from './list-scroll-props';
import type { TileListProps } from './list-tile-props';
import { ListTiles } from './list-tiles';

function useDataListProps<Item>(
  props: DataListProps<Item>,
): ScrollFadeListProps<Item> {
  const renderItem = useRenderedRows(props);

  return {
    ...useScrollProps(props),
    ...useKeptRows(props),
    data: props.items ?? [],
    renderItem,
    contentContainerStyle: useListPadding(props),
    ListEmptyComponent: (
      <ListEmpty isLoading={props.isLoading} empty={props.empty} />
    ),
  };
}

/*
 * Which rows draw again: a row equal to the one before (`itemsAreEqual`) draws again only when what it reads outside
 * its item changes, its caller's extra data and the gutter it holds.
 */
function useKeptRows<Item>(
  props: DataListProps<Item>,
): Pick<ScrollFadeListProps<Item>, 'extraData' | 'itemsAreEqual'> {
  return {
    itemsAreEqual: props.itemsAreEqual,
    extraData: { caller: props.extraData, gutter: useRowGutter(props) },
  };
}

const fill = { flex: 1, minWidth: '100%' } as const;

// A List of children keeps a row whose entry is unchanged (`sameChild`); a List of items has no entry of its own.
type DataListProps<Item> = TileListProps<Item> &
  Pick<ScrollFadeListProps<Item>, 'itemsAreEqual'>;

// Its fades blend into the surface behind the list: a popover's card, else the page.
export function DataList<Item>({
  itemsAreEqual,
  ...props
}: DataListProps<Item>): ReactElement {
  if (props.layout === 'grid' || props.direction === 'horizontal')
    return (
      <RowHighlightProvider>
        <ListTiles {...props} />
      </RowHighlightProvider>
    );

  return <RowList {...props} itemsAreEqual={itemsAreEqual} />;
}

function RowList<Item>(props: DataListProps<Item>): ReactElement {
  return (
    <ListGrouping list={props}>
      <RowHighlightProvider>
        <ScrollFadeList
          surfaceClassName={useListLook().menu ? 'bg-card' : 'bg-content'}
          style={fill}
          {...useDataListProps(props)}
        />
      </RowHighlightProvider>
    </ListGrouping>
  );
}
