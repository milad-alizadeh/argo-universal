import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { TileListProps } from './list-tile-props';
import type { TileGeometry } from './use-tile-layout';

function gridHeader<Item>(
  props: TileListProps<Item>,
  geometry: TileGeometry,
): ReactElement | undefined {
  if (geometry.horizontal || !props.header) return undefined;

  return (
    <View style={{ paddingHorizontal: geometry.gap / 2 }}>{props.header}</View>
  );
}

export function tileStart<Item>(
  props: TileListProps<Item>,
  geometry: TileGeometry,
): ReactElement {
  return (
    <>
      {props.startContent}
      {gridHeader(props, geometry)}
    </>
  );
}
