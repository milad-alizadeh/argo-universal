import type { IconName } from '@expo/ui';
import { drawnSymbol } from './drawn-symbol';
import { type IconSymbol, resolveIcon } from './icon-symbol';
import { materialImage } from './material-images/material-images';
import { materialGlyphScale } from './symbol-glyph/material-glyph-scale';

/*
 * The Material XML drawing Expo UI's Icon draws for an Argo icon. @expo/material-symbols ships the outlined
 * style only, so a filled icon has none, nor does a Tabler icon or a name the package lacks.
 */
export function nativeIconName(
  icon: IconSymbol,
  filled?: boolean,
): IconName | undefined {
  const { symbol, materialFill } = resolveIcon(icon);
  const drawn = drawnSymbol(symbol, filled, materialFill);

  if (drawn.kind === 'tabler' || drawn.filled) return undefined;

  return materialImage(drawn.material);
}

// A Material drawing has its padding inside its 24-unit grid, so it takes Argo's one Material multiple.
export const nativeIconSize = (pixels: number): number =>
  pixels * materialGlyphScale;
