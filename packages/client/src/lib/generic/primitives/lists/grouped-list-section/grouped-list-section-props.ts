import type { ReactNode } from 'react';

export interface GroupedListSectionProps {
  children: ReactNode;
  title?: string;
  footer?: string;
  // The footer reads as a failure, such as a field's error standing in for its hint.
  tone?: 'danger';
}
