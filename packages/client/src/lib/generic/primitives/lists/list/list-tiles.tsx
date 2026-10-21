import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type { ReactElement } from 'react';
import { View, type ViewProps } from 'react-native';
import { SvgBudget } from '#primitives/visual';
import { ListTileContext } from '../../../list-context';
import { ScrollFadeList } from '../../../scroll-fade/scroll-fade-list';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import { useRenderedRows, ListEmpty } from './list-data';
import { scrollProps } from './list-scroll-props';
import { ShelfHeader, useShelf } from './list-shelf';
import type { TileListProps } from './list-tile-props';
import { TileCell } from './tile-cell';
import { TileVisibility, useTileVisibility } from './tile-visibility';
import { useTileLayout, viewportInsets } from './use-tile-layout';

export function ListTiles<Item>(props: TileListProps<Item>): ReactElement {
  const geometry = useTileLayout(props);
  const shelf = useShelf(props, geometry);

  return (
    <SvgBudget>
      <TileFrame geometry={geometry} shelf={shelf}>
        <TileBody props={props} geometry={geometry} shelf={shelf} />
      </TileFrame>
    </SvgBudget>
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

  return (
    <TileVisibility value={visibility.indices}>
      <ScrollFadeList
        {...tileScrollProps(input)}
        renderItem={renderItem}
        onViewableItemsChanged={visibility.update}
      />
    </TileVisibility>
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
    ...rowCell(input.props, row, input.geometry),
    index: row.index,
    onHeight: input.shelf.onHeight,
  };
}

function gridHeader<Item>(
  props: TileListProps<Item>,
  geometry: Geometry,
): ReactElement | undefined {
  if (geometry.horizontal || !props.header) return undefined;

  return (
    <View style={{ paddingHorizontal: geometry.gap / 2 }}>{props.header}</View>
  );
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
    ...scrollProps(props),
    ...geometry.scroll,
    ref: shelf.ref,
    onScroll: shelf.onScroll,
    data: props.items ?? [],
    ListHeaderComponent: gridHeader(props, geometry),
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

function rowCell<Item>(
  props: TileListProps<Item>,
  row: LegendListRenderItemProps<Item>,
  geometry: Geometry,
): Geometry['cell'] {
  const width = props.fullSpan?.(row.item)
    ? geometry.viewport - geometry.padding * 2
    : geometry.width;

  return { ...geometry.cell, width };
}

function tileSpan<Item>(
  props: TileListProps<Item>,
  columns: number,
): ScrollFadeListProps<Item>['overrideItemLayout'] {
  return (layout, item) => {
    if (props.fullSpan?.(item)) layout.span = columns;
  };
}
