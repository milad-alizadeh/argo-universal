import type { ReactNode } from 'react';

// The web keeps the footer where the browser puts it; only a phone's soft keyboard covers the foot of the page.
export function PinnedFooterKeyboard({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
