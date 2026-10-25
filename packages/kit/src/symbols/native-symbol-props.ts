import type { IconSize } from './icon-size';
import type { IconSymbol } from './icon-symbol';

export interface NativeSymbolProps {
  name: IconSymbol;
  // Unset, the size the control around the icon gives it (IconSizeProvider).
  size?: IconSize;
  filled?: boolean;
  // Draws in the platform's secondary tone, as a row's chevron or a search lens does.
  muted?: boolean;
}
