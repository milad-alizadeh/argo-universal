import { Orb } from '@repo/kit/primitives/status/orb';
import type * as React from 'react';
import { View } from 'react-native';
import { ShimmerText } from '../shimmer-text';

// The Feed's header, so the list's own inset keeps it below a transparent header. It takes no height, so showing it never moves the rows and the reader keeps their place.
export function LoadingEarlier({
  loading,
}: {
  loading: boolean;
}): React.JSX.Element {
  return (
    <View className="z-10 h-0 items-center overflow-visible">
      {loading && <LoadingEarlierPill />}
    </View>
  );
}

function LoadingEarlierPill(): React.JSX.Element {
  return (
    <View
      role="progressbar"
      accessibilityLabel="Loading earlier"
      className="absolute top-0 min-h-5 flex-row items-center justify-center gap-1.5 rounded-full bg-content px-2"
    >
      <Orb size="sm" />
      <ShimmerText text="Loading earlier" className="type-body" />
    </View>
  );
}
