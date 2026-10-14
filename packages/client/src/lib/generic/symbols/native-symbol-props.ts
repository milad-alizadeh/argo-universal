import type { IconName } from './icon-names';
import type { IconRole } from './icon-role';

export interface NativeSymbolProps {
  name: IconName;
  role: IconRole;
  filled?: boolean;
  // Draws in the platform's secondary tone, as a row's chevron or a search lens does.
  muted?: boolean;
  // Draws in the accent, as a chosen row's checkmark does.
  accent?: boolean;
}
