import type { ReactNode } from 'react';

export type GroupedListContentProps = {
  children: ReactNode;
  // A section title above the content, such as the Plugin that drew it; the content still has no card.
  title?: string;
};
