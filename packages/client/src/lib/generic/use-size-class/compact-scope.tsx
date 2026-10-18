import { createContext, type ReactNode, use } from 'react';

const InCompactScope = createContext(false);

/*
 * Content a native system sheet holds: on a tablet it draws as on a phone, as Paper's iPad and
 * Android sheets do, so it lays out as compact whatever the window's size class (#927).
 */
export function CompactScope(props: { children: ReactNode }): ReactNode {
  return <InCompactScope value>{props.children}</InCompactScope>;
}

export function useInCompactScope(): boolean {
  return use(InCompactScope);
}
