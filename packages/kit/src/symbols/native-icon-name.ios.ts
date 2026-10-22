import type { IconName } from '@expo/ui';
import { isCustomSymbol } from './custom-symbols';
import { drawnSymbol } from './drawn-symbol';
import { type IconSymbol, resolveIcon } from './icon-symbol';

/*
 * The SF Symbol Expo UI's Icon draws for an Argo icon. Its Icon takes only system symbols, so Argo's own
 * symbols (`custom.robot`) and Tabler icons, which live in the asset catalog, have none.
 */
export function nativeIconName(
  icon: IconSymbol,
  filled?: boolean,
): IconName | undefined {
  const drawn = drawnSymbol(resolveIcon(icon).symbol, filled);

  if (drawn.kind === 'tabler' || isCustomSymbol(drawn.sf)) return undefined;

  return drawn.sf;
}

// SF Symbols draw at the role's point size, as Argo's Icon draws them.
export const nativeIconSize = (pixels: number): number => pixels;
