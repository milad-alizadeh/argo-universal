import type { ReactNode } from 'react';

// The web and iOS draw a section's React Native content as it is; only Android's Compose column needs it hosted.
export function HostedSectionContent(props: {
  children: ReactNode;
}): ReactNode {
  return props.children;
}
