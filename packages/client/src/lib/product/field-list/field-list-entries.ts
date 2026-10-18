import type { ReactElement } from 'react';

export interface FieldListSection {
  title?: string;
  footer?: string;
  plain?: boolean;
  // The section's rows, ListItems with keys of their own.
  rows: readonly ReactElement[];
}
