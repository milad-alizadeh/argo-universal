import type * as React from 'react';
import { View } from 'react-native';
import { Skeleton } from '#primitives/status/skeleton';

// Sized as a typical diagram, so the Feed moves little when the drawing replaces it.
export function DiagramPlaceholder(): React.JSX.Element {
  return (
    <Skeleton loading accessibilityLabel="Drawing diagram">
      <View className="aspect-video w-full rounded-lg bg-muted" />
    </Skeleton>
  );
}
