import { useState } from 'react';
import type { LayoutChangeEvent, ViewStyle } from 'react-native';
import {
  type ContentColumn,
  useClaimColumn,
} from '#kit/content-column/content-column';
import { useSpacingStep } from '#primitives/layout/spacing';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import type { SizeClass } from '../../../use-size-class/size-class';
import { useSizeClass } from '../../../use-size-class/use-size-class';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';
import type { ListProps } from './list-props';
import { tileLayout } from './list-tile-layout';
import { tileContentWidth } from './list-tile-width';

const tileGapStep = 3;

const tileInsetStep = 4;

const captionEstimate = 72;

export interface TileGeometry {
  columns: number;
  width: number;
  aspect: number;
  sizeClass: SizeClass;
  horizontal: boolean;
  viewport: number;
  gap: number;
  padding: number;
  onLayout: (event: LayoutChangeEvent) => void;
  cell: { width: number; gap: number; horizontal: boolean };
  scroll: TileScrollOptions;
}

type TileScrollOptions = Pick<
  ScrollFadeListProps<unknown>,
  | 'horizontal'
  | 'numColumns'
  | 'columnWrapperStyle'
  | 'contentContainerStyle'
  | 'maxHeight'
  | 'fitHeight'
  | 'viewabilityConfig'
  | 'estimatedItemSize'
  | 'recycleItems'
  | 'drawDistance'
>;

export interface TileMetrics {
  column: ContentColumn | undefined;
  viewport: number;
  sizeClass: SizeClass;
  gap: number;
  padding: number;
  onLayout: TileGeometry['onLayout'];
}

function useTileMetrics<Item>(props: ListProps<Item>): TileMetrics {
  const [viewport, setViewport] = useState(0);

  const padding = useSpacingStep(
    useSizeClassValue(props.padding ?? tileInsetStep),
  );

  return {
    viewport,
    column: useClaimColumn(),
    sizeClass: useSizeClass(),
    gap: useSpacingStep(tileGapStep),
    padding,
    onLayout: (event) => setViewport(event.nativeEvent.layout.width),
  };
}

export function useTileLayout<Item>(props: ListProps<Item>): TileGeometry {
  const metrics = useTileMetrics(props);
  const layout = layoutFor(props, metrics);

  return {
    ...metrics,
    ...layout,
    cell: tileCellOptions(layout),
    scroll: tileScrollProps(props, layout),
  };
}

function layoutFor<Item>(props: ListProps<Item>, metrics: TileMetrics): Layout {
  return {
    ...tileLayout(props, contentMetrics(props, metrics)),
    horizontal: props.direction === 'horizontal',
    gap: metrics.gap,
    padding: metrics.padding,
  };
}

function contentMetrics<Item>(
  props: ListProps<Item>,
  metrics: TileMetrics,
): Parameters<typeof tileLayout>[1] {
  return {
    width: tileContentWidth(props.direction, metrics),
    gap: metrics.gap,
    sizeClass: metrics.sizeClass,
  };
}

function tileCellOptions(layout: Layout): TileGeometry['cell'] {
  return {
    width: layout.width,
    gap: layout.gap,
    horizontal: layout.horizontal,
  };
}

type Layout = ReturnType<typeof tileLayout> & {
  gap: number;
  padding: number;
  horizontal: boolean;
};

const tileScrollDefaults = {
  viewabilityConfig: { itemVisiblePercentThreshold: 1 },
  recycleItems: true,
  drawDistance: 0,
};

function tileScrollProps<Item>(
  props: ListProps<Item>,
  layout: Layout,
): TileScrollOptions {
  return {
    ...tileScrollDefaults,
    horizontal: layout.horizontal,
    numColumns: layout.columns,
    columnWrapperStyle: columnGaps(layout),
    contentContainerStyle: tileContentStyle(layout),
    maxHeight: layout.horizontal ? undefined : props.maxHeight,
    fitHeight: layout.horizontal ? undefined : props.fitHeight,
    estimatedItemSize: tileEstimate(layout),
  };
}

function tileContentStyle(layout: Layout): ViewStyle {
  return {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: layout.gap,
  };
}

function tileEstimate(layout: Layout): number {
  return layout.horizontal
    ? layout.width + layout.gap
    : layout.width / layout.aspect + captionEstimate;
}

function columnGaps(layout: Layout): TileScrollOptions['columnWrapperStyle'] {
  return layout.horizontal ? undefined : { columnGap: layout.gap };
}

// LegendList pads both sides of a column by half its gap; extend the viewport so tiles keep the outer inset.
export function viewportInsets(geometry: TileGeometry): ViewStyle {
  const halfGap = geometry.horizontal ? 0 : geometry.gap / 2;
  const marginLeft = geometry.padding - halfGap;

  return { marginLeft, marginRight: geometry.horizontal ? 0 : marginLeft };
}
