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
  /*
   * Draws as the system draws its own selection mark: the body text style at the semibold weight, as a stock List's
   * checkmark. Only SwiftUI has one; elsewhere the role sizes it.
   */
  systemMark?: boolean;
}
