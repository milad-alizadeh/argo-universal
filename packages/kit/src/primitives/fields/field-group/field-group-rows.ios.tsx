import type { ReactNode } from 'react';

// SwiftUI's Form sizes its own rows; each child stays the row element SwiftUI reads.
export function sectionRows(children: ReactNode): ReactNode {
  return children;
}
