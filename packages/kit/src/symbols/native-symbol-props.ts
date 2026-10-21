import type { IconRole } from './icon-role';
import type { IconSymbol } from './icon-symbol';

export interface NativeSymbolProps {
  name: IconSymbol;
  role: IconRole;
  filled?: boolean;
  // Draws in the platform's secondary tone, as a row's chevron or a search lens does.
  muted?: boolean;
}
