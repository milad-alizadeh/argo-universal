import type { ReactElement } from 'react';
import { useListLook } from '../../../list-look-context';
import { RowHighlightProvider } from '../../../row-highlights';
import { ScrollFadeList } from '../../../scroll-fade/scroll-fade-list';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import { ListEmpty, useRenderedRows, useListPadding } from './list-data';
import { ListGrouping } from './list-grouping';
import type { ListProps } from './list-props';
import { useScrollProps } from './list-scroll-props';
import type { TileListProps } from './list-tile-props';
import { ListTiles } from './list-tiles';

function useDataListProps<Item>(
  props: ListProps<Item>,
): ScrollFadeListProps<Item> {
  const renderItem = useRenderedRows(props);
  const contentContainerStyle = useListPadding(props);

  return {
    ...useScrollProps(props),
    data: props.items ?? [],
    renderItem,
    contentContainerStyle,
    ListEmptyComponent: (
      <ListEmpty isLoading={props.isLoading} empty={props.empty} />
    ),
  };
}

const fill = { flex: 1, minWidth: '100%' } as const;

// Its fades blend into the surface behind the list: a popover's card, else the page.
export function DataList<Item>(props: TileListProps<Item>): ReactElement {
  if (props.layout === 'grid' || props.direction === 'horizontal')
    return (
      <RowHighlightProvider>
        <ListTiles {...props} />
      </RowHighlightProvider>
    );

  return <RowList {...props} />;
}

function RowList<Item>(props: ListProps<Item>): ReactElement {
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
