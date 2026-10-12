import type { ReactNode } from 'react';
import { useWide } from '../../../use-wide/use-wide';
import { FieldRowHosted } from '../../fields/field-layout';
import { Host } from '../../native/host';

// A phone row in a native Host of its own, for a virtualised list; a wide window draws the row in React Native.
export function ListItemHost({ children }: { children: ReactNode }): ReactNode {
  if (useWide()) return children;
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <FieldRowHosted value>{children}</FieldRowHosted>
    </Host>
  );
}
