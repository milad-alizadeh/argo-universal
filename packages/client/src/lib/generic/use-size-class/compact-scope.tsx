import { createContext, type ReactNode, use } from 'react';

const InCompactScope = createContext(false);

interface CompactScopeProps {
  children: ReactNode;
  // Off keeps the scope's place in the tree, so its content keeps its state when the scope ends.
  active?: boolean;
}

/*
 * Content that draws as on a phone whatever the window's size class (#927): what a native system
 * sheet holds on a tablet, as Paper's iPad and Android sheets do, and an iPad's Settings pages
 * in the medium window's pane, as Paper's medium Settings board does.
 */
export function CompactScope({
  children,
  active = true,
}: CompactScopeProps): ReactNode {
  return <InCompactScope value={active}>{children}</InCompactScope>;
}

export function useInCompactScope(): boolean {
  return use(InCompactScope);
}
