import type { ReactElement, ReactNode } from 'react';

export interface ComposerPopoverProps {
  trigger: ReactElement<{ disabled?: boolean | null; onPress?: () => void }>;
  label: string;
  width?: number;
  listContent?: boolean;
  // A phone titles the sheet with the kit's page header, as its first page, instead of the centred label.
  pageHeader?: boolean;
  className?: string;
  // `after` runs once the overlay has left the screen, so it may present a system picker.
  children: (close: (after?: () => void) => void) => ReactNode;
}
