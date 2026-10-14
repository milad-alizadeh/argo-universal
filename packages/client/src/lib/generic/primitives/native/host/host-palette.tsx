import type * as React from 'react';
import type { NativeColors } from '#lib/generic/native-theme';

// Only Android's Material views read a palette; SwiftUI takes the Host's colour scheme and tint.
export function HostPalette(props: {
  colors: NativeColors;
  children: React.ReactNode;
}): React.ReactNode {
  return props.children;
}
