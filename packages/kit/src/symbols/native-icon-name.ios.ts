import type { IconName } from '@expo/ui';
import type { IconSymbol } from './icon-symbol';
import { iosSystemName } from './ios-image';

// The SF Symbol Expo UI's Icon draws for an Argo icon; it takes only system symbols, so Argo's own and SVG icons have none.
export function nativeIconName(
  icon: IconSymbol,
  filled?: boolean,
): IconName | undefined {
  return iosSystemName(icon, filled);
}
