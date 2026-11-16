import type * as React from 'react';
import { View } from 'react-native';
import { Skeleton } from '#primitives/status/skeleton';

// While the fence streams: a 16:9 box the size of a typical diagram, pulsing until the drawing replaces it.
export function DiagramPlaceholder(): React.JSX.Element {
  return (
    <Skeleton loading accessibilityLabel="Drawing diagram">
      <View
        testID="diagram-placeholder"
        className="aspect-video w-full rounded-lg bg-muted"
      />
    </Skeleton>
  );
}
