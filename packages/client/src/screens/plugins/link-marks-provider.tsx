import type { ReactNode } from 'react';

export interface LinkMarksProviderProps {
  // The Project the links are drawn in; none until the Session's Project is known.
  projectId: string | undefined;
  children: ReactNode;
}

// Link marks draw beside a hover preview, which only the web has.
export function LinkMarksProvider({
  children,
}: LinkMarksProviderProps): ReactNode {
  return children;
}
