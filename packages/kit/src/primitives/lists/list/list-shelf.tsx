import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import type { ListProps } from './list-props';
import { useShelfControls, type ShelfControls } from './list-shelf-controls';
import { useShelfHeight } from './use-shelf-height';
import type { TileGeometry } from './use-tile-layout';

export interface Shelf {
  ref: ShelfControls['ref'];
  onHeight: (index: number, height: number) => void;
  style?: { height: number };
  onScroll: ShelfControls['onScroll'];
  header: HeaderProps;
}

interface HeaderProps {
  children?: ReactNode;
  horizontal: boolean;
  compact: boolean;
  onHeight: (height: number) => void;
  controls: ShelfControls;
}

export function useShelf<Item>(
  props: ListProps<Item>,
  geometry: TileGeometry,
): Shelf {
  const { height, measure: onHeight } = useShelfHeight();
  const [headerHeight, onHeaderHeight] = useState(0);
  const controls = useShelfControls(props, geometry);

  return {
    ref: controls.ref,
    onScroll: controls.onScroll,
    onHeight,
    header: shelfHeaderProps(props, geometry, { controls, onHeaderHeight }),
    style: shelfStyle(geometry, height + headerHeight),
  };
}

export function ShelfHeader(props: HeaderProps): ReactNode {
  if (!props.horizontal) return null;

  return (
    <View
      className="flex-row items-center justify-between px-4 pb-2"
      onLayout={(event) => props.onHeight(event.nativeEvent.layout.height)}
    >
      {props.children}
      {props.compact ? null : <ShelfButtons {...props.controls} />}
    </View>
  );
}

function ShelfButtons(props: ShelfControls): React.JSX.Element {
  return (
    <View className="flex-row gap-1">
      <IconButton {...previousButton(props)} />
      <IconButton {...nextButton(props)} />
    </View>
  );
}

function previousButton(
  props: ShelfControls,
): React.ComponentProps<typeof IconButton> {
  return {
    icon: 'chevron-left',
    accessibilityLabel: 'Previous items',
    variant: 'ghost',
    disabled: props.atStart,
    onPress: () => props.move(-1),
  };
}

function nextButton(
  props: ShelfControls,
): React.ComponentProps<typeof IconButton> {
  return {
    icon: 'chevron-right',
    accessibilityLabel: 'Next items',
    variant: 'ghost',
    disabled: props.atEnd,
    onPress: () => props.move(1),
  };
}

interface HeaderState {
  controls: ShelfControls;
  onHeaderHeight: (height: number) => void;
}

function shelfHeaderProps<Item>(
  props: ListProps<Item>,
  geometry: TileGeometry,
  state: HeaderState,
): HeaderProps {
  return {
    children: props.header,
    horizontal: geometry.horizontal,
    compact: geometry.sizeClass === 'compact',
    onHeight: state.onHeaderHeight,
    controls: state.controls,
  };
}

function shelfStyle(geometry: TileGeometry, height: number): Shelf['style'] {
  return geometry.horizontal ? { height: height + geometry.gap } : undefined;
}
