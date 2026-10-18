import type { ReactElement } from 'react';

export interface StackedRowProps {
  children: ReactElement;
  // The row leads with an icon or image, so its separator starts under the title.
  icon?: boolean;
}
