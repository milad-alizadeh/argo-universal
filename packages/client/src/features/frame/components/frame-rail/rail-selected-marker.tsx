import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { View } from 'react-native';
import { railTiles } from './rail-tile-style';

/*
 * Icons stay outlined when selected, since a Plugin's own icon has no filled twin; a marker at the rail's edge says
 * which section is open instead. Android's Material indicator needs none.
 */
export function SelectedMarker(props: { selected: boolean }): React.ReactNode {
  if (!props.selected || !railTiles.marker) return null;

  return (
    <View
      testID="rail-selected-marker"
      pointerEvents="none"
      className={cn(
        'absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-foreground',
        railTiles.marker,
      )}
    />
  );
}
