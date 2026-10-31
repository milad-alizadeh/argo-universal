import type { ReactNode } from 'react';

// The web draws a section's React Native content as it is; iOS's SwiftUI Form and Android's Compose column host it.
export function HostedSectionContent(props: {
  children: ReactNode;
}): ReactNode {
  return props.children;
}
