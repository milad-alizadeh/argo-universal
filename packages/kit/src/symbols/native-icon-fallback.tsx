import type { ReactElement } from 'react';
import type { NativeIconProps } from './native-icon';

// Native: an icon Expo UI's Icon cannot draw stays undrawn here; NativeSymbol hosts Argo's own icon for those.
export function NativeIconFallback(
  _props: NativeIconProps,
): ReactElement | null {
  return null;
}
