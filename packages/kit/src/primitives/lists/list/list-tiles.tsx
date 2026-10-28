import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type { ReactElement } from 'react';
import { View, type ViewProps } from 'react-native';
import { SvgBudget } from '#primitives/visual';
import { ListTileContext } from '../../../list-context';
import { ScrollFadeList } from '../../../scroll-fade/scroll-fade-list';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import { useRenderedRows, ListEmpty } from './list-data';
import { ListGrouping } from './list-grouping';
import { useScrollProps } from './list-scroll-props';
import { ShelfHeader, useShelf } from './list-shelf';
import { tileStart } from './list-tile-header';
import type { TileListProps } from './list-tile-props';
import { TileCell } from './tile-cell';
import { TileViewportVisibility } from './tile-viewport-visibility';
import { useTileVisibility } from './tile-visibility';
import { useTileLayout, viewportInsets } from './use-tile-layout';

export function ListTiles<Item>(props: TileListProps<Item>): ReactElement {
  const geometry = useTileLayout(props);
  const shelf = useShelf(props, geometry);

  return (
    <ListGrouping list={props}>
      <SvgBudget>
        <TileFrame geometry={geometry} shelf={shelf}>
          <TileBody props={props} geometry={geometry} shelf={shelf} />
        </TileFrame>
      </SvgBudget>
    </ListGrouping>
  );
}

type Geometry = ReturnType<typeof useTileLayout>;

type Shelf = ReturnType<typeof useShelf>;

interface ScrollProps<Item> {
  props: TileListProps<Item>;
  geometry: Geometry;
  shelf: Shelf;
}

function TileScroll<Item>(input: ScrollProps<Item>): ReactElement {
  const renderItem = useTileRenderer(input);
  const visibility = useTileVisibility<Item>();
  const scroll = useScrollProps(input.props);

  return (
    <TileViewportVisibility indices={visibility.indices}>
      <ScrollFadeList
        {...scroll}
        {...tileScrollProps(input)}
        renderItem={renderItem}
        onViewableItemsChanged={visibility.update}
      />
    </TileViewportVisibility>
  );
}

function useTileRenderer<Item>(
  input: ScrollProps<Item>,
): (row: LegendListRenderItemProps<Item>) => ReactElement {
  const renderItem = useRenderedRows({ ...input.props, padding: 0 });

  return (row) => (
    <TileCell {...cellProps(input, row)}>{renderItem(row)}</TileCell>
  );
}

function cellProps<Item>(
  input: ScrollProps<Item>,
  row: LegendListRenderItemProps<Item>,
): Omit<React.ComponentProps<typeof TileCell>, 'children'> {
  return {
    ...input.geometry.cell,
    index: row.index,
    onHeight: input.shelf.onHeight,
  };
}

interface FrameProps {
  geometry: Geometry;
  shelf: Shelf;
  children: ReactElement;
}

function TileFrame({ geometry, shelf, children }: FrameProps): ReactElement {
  return (
    <View {...frameAttributes(geometry, shelf)}>
      <ShelfHeader {...shelf.header} />
      <TileViewport geometry={geometry}>{children}</TileViewport>
    </View>
  );
}

function frameAttributes(geometry: Geometry, shelf: Shelf): ViewProps {
  return {
    className: geometry.horizontal ? 'min-h-0' : 'min-h-0 flex-1',
    style: shelf.style,
    onLayout: geometry.onLayout,
  };
}

function TileViewport({
  geometry,
  children,
}: {
  geometry: Geometry;
  children: ReactElement;
}): ReactElement {
  return (
    <View className="min-h-0 flex-1" style={viewportInsets(geometry)}>
      {children}
    </View>
  );
}

function tileScrollProps<Item>(
  input: ScrollProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  const { props, geometry, shelf } = input;

  return {
    ...geometry.scroll,
    ref: shelf.ref,
    onScroll: shelf.onScroll,
    data: props.items ?? [],
    ListHeaderComponent: tileStart(props, geometry),
    ListEmptyComponent: <ListEmpty {...props} />,
    overrideItemLayout: tileSpan(props, geometry.columns),
  };
}

function TileBody<Item>({
  props,
  geometry,
  shelf,
}: ScrollProps<Item>): ReactElement | null {
  if (geometry.width === 0) return null;

  return (
    <ListTileContext value={{ aspect: geometry.aspect }}>
      <TileScroll props={props} geometry={geometry} shelf={shelf} />
    </ListTileContext>
  );
}

function tileSpan<Item>(
  props: TileListProps<Item>,
  columns: number,
): ScrollFadeListProps<Item>['overrideItemLayout'] {
  return (layout, item) => {
    if (props.fullSpan?.(item)) layout.span = columns;
  };
}
