import type { SFSymbol } from 'expo-symbols';
import type { DrawnIcon } from '../../../symbols/icon-symbol';
import { iosSystemName } from '../../../symbols/ios-image';

export function sidebarSystemImage(icon?: DrawnIcon): SFSymbol | undefined {
  return icon && (typeof icon === 'string' || 'sf' in icon)
    ? iosSystemName(icon)
    : undefined;
}
