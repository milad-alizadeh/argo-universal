import { Icon } from '@expo/ui';
import type { ReactElement } from 'react';
import type { ColorValue } from 'react-native';
import { type IconRole, useIconPixels } from './icon-role';
import type { IconSymbol } from './icon-symbol';
import { NativeIconFallback } from './native-icon-fallback';
import { nativeIconName, nativeIconSize } from './native-icon-name';

export interface NativeIconProps {
  name: IconSymbol;
  role: IconRole;
  // A native theme colour; unset, the icon takes the Compose control's content colour (iOS: the tint).
  color: ColorValue | undefined;
  filled?: boolean;
  // Argo's own drawing for an icon Expo UI's Icon cannot draw; unset, the web draws Argo's Icon and native draws nothing.
  fallback?: ReactElement;
}

// An Argo icon inside an Expo UI tree: Expo UI's own Icon where the platform has the drawing (nativeIconName).
export function NativeIcon(props: NativeIconProps): ReactElement | null {
  const pixels = useIconPixels(props.role);
  const name = nativeIconName(props.name, props.filled);

  if (name === undefined)
    return props.fallback ?? <NativeIconFallback {...props} />;

  return <Icon name={name} size={nativeIconSize(pixels)} color={props.color} />;
}
