import type * as React from 'react';
import type { NativeColors } from '#lib/generic/native-theme';
import { MaterialPalette } from './material-palette';

// Material views read Argo's colours from the palette around them.
export function HostPalette(props: {
  colors: NativeColors;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <MaterialPalette colors={props.colors}>{props.children}</MaterialPalette>
  );
}
