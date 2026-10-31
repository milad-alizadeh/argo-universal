import { Icon } from '@expo/ui';
import type { ReactElement } from 'react';
import type { ColorValue } from 'react-native';
import { useIconSize } from '#primitives/content/icon';
import { type IconSize, useIconPixels } from './icon-size';
import type { IconSymbol } from './icon-symbol';
import { NativeIconFallback } from './native-icon-fallback';
import { nativeIconName } from './native-icon-name';

export interface NativeIconProps {
  name: IconSymbol;
  // Unset, the size the control around the icon gives it (IconSizeProvider).
  size?: IconSize;
  // A native theme colour; unset, the icon takes the Compose control's content colour (iOS: the tint).
  color: ColorValue | undefined;
  filled?: boolean;
  // Draws the icon centred in a square box of its own size, so rows of icons that fill their size to different widths (SF Symbols do) start their labels on one line.
  slot?: boolean;
  // Argo's own drawing for an icon Expo UI's Icon cannot draw; unset, the web draws Argo's Icon and native draws nothing.
  fallback?: ReactElement;
}

// An Argo icon inside an Expo UI tree: Expo UI's own Icon where the platform has the drawing (nativeIconName).
export function NativeIcon(props: NativeIconProps): ReactElement | null {
  const pixels = useIconPixels(useIconSize(props.size));
  const name = nativeIconName(props.name, props.filled);

  if (name === undefined)
    return props.fallback ?? <NativeIconFallback {...props} />;

  return (
    <Icon
      name={name}
      size={pixels}
      color={props.color}
      style={slotBox(props.slot, pixels)}
    />
  );
}

const slotBox = (
  slot: boolean | undefined,
  pixels: number,
): { width: number; height: number } | undefined =>
  slot ? { width: pixels, height: pixels } : undefined;
