import type * as React from 'react';
import { Host } from './host';

export function SegmentedControlHost(props: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      {props.children}
    </Host>
  );
}
