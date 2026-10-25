import type { IconName } from '@expo/ui';
import { drawnSymbol } from './drawn-symbol';
import { type IconSymbol, resolveIcon } from './icon-symbol';
import {
  materialFilledImage,
  materialImage,
} from './material-images/material-images';

/*
 * The Material XML drawing Expo UI's Icon draws for an Argo icon: outlined from @expo/material-symbols, filled from
 * assets/material-filled. An SVG icon has none, nor does a name outside both.
 */
export function nativeIconName(
  icon: IconSymbol,
  filled?: boolean,
): IconName | undefined {
  const { symbol, materialFill } = resolveIcon(icon);
  const drawn = drawnSymbol(symbol, filled, materialFill);

  if (drawn.kind === 'svg') return undefined;

  return drawn.filled
    ? materialFilledImage(drawn.material)
    : materialImage(drawn.material);
}
