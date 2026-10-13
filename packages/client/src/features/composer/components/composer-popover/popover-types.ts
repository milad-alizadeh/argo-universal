import type { ReactElement, ReactNode } from 'react';

export interface ComposerPopoverProps {
  trigger: ReactElement<{ disabled?: boolean | null; onPress?: () => void }>;
  label: string;
  width?: number;
  listContent?: boolean;
  className?: string;
  // Replaces the overlay, for a menu the app presents itself.
  onPresent?: () => void;
  // `after` runs once the overlay has left the screen, so it may present a system picker.
  children: (close: (after?: () => void) => void) => ReactNode;
}
