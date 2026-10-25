import type { IconName } from '@expo/ui';
import type { IconSymbol } from './icon-symbol';

// Expo UI's Icon draws nothing on the web, so there every icon stays Argo's own.
export function nativeIconName(
  _icon: IconSymbol,
  _filled?: boolean,
): IconName | undefined {
  return undefined;
}
