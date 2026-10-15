import type * as React from 'react';

// Only Compose reads Material's surface roles; SwiftUI keeps the system's grouped page and rows.
export function HostPalette({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return children;
}
