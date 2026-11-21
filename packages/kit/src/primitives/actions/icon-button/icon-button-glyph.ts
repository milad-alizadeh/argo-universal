import type { SFSymbol } from 'expo-symbols';
import type { CustomSymbol } from '../../../symbols/custom-symbols';
import type { IconSymbol } from '../../../symbols/icon-symbol';
import { iosImage } from '../../../symbols/ios-image';

/*
 * What an iOS icon button draws in its circle. SwiftUI's Button takes only an SF Symbol by name; given none, it draws
 * the spoken name as text and sizes the button to it, so Argo's own symbol is an asset image and an SVG icon is hosted
 * from React Native instead.
 */
export type IconButtonGlyph =
  | { kind: 'system'; name: SFSymbol }
  | { kind: 'asset'; name: CustomSymbol }
  | { kind: 'hosted' };

export const iconButtonGlyph = (
  icon: IconSymbol,
  selected: boolean,
): IconButtonGlyph => iosImage(icon, selected) ?? { kind: 'hosted' };
