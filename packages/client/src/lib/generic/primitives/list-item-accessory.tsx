import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
} from 'react';

const InListItem = createContext(false);

export function ListItemAccessory({
  children,
}: {
  children?: ReactNode;
}): ReactElement {
  return <InListItem.Provider value>{children}</InListItem.Provider>;
}

export function useInListItem(): boolean {
  return useContext(InListItem);
}
