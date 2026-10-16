import type { ReactElement, ReactNode } from 'react';

export interface ComposerPopoverProps {
  trigger: ReactElement<{ disabled?: boolean | null; onPress?: () => void }>;
  label: string;
  width?: number;
  side?: 'top' | 'bottom' | 'left' | 'right';
  contentClassName?: string;
  listContent?: boolean;
  className?: string;
  // `after` runs once the overlay has left the screen, so it may present a system picker.
  children: (close: (after?: () => void) => void) => ReactNode;
}
