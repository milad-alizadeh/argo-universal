import type { SFSymbol } from 'expo-symbols';
import { type CustomSymbol, isCustomSymbol } from './custom-symbols';
import { drawnSymbol } from './drawn-symbol';
import { type IconSymbol, resolveIcon } from './icon-symbol';

// What a SwiftUI or UIKit surface can draw for an Argo icon: a system SF Symbol by name, or Argo's own symbol, an asset-catalog image.
export type IosImage =
  | { kind: 'system'; name: SFSymbol }
  | { kind: 'asset'; name: CustomSymbol };

// An SVG icon has no image a native iOS surface can draw (ADR-0041), so it is nothing.
export function iosImage(
  icon: IconSymbol,
  filled?: boolean,
): IosImage | undefined {
  const drawn = drawnSymbol(resolveIcon(icon).symbol, filled);

  if (drawn.kind === 'svg') return undefined;

  return isCustomSymbol(drawn.sf)
    ? { kind: 'asset', name: drawn.sf }
    : { kind: 'system', name: drawn.sf };
}

// The SF Symbol name alone, for a surface that takes no asset image.
export function iosSystemName(
  icon: IconSymbol,
  filled?: boolean,
): SFSymbol | undefined {
  const image = iosImage(icon, filled);

  return image?.kind === 'system' ? image.name : undefined;
}
