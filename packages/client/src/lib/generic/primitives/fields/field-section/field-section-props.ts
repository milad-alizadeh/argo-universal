import type { ReactNode } from 'react';

export interface FieldSectionProps {
  children: ReactNode;
  title?: string;
  footer?: string;
  // The footer reads as a failure, such as a field's error standing in for its hint.
  footerTone?: 'destructive';
  /*
   * The section holds row TextInputs. Android stacks them as bare Material fields, each with its
   * hint or error under it, so it draws no card and no footer; iOS and the web keep both.
   */
  textFields?: boolean;
}
