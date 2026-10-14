import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
} from 'react';

const InGroupedListItem = createContext(false);

export function GroupedListItemAccessory({
  children,
}: {
  children?: ReactNode;
}): ReactElement {
  return (
    <InGroupedListItem.Provider value>{children}</InGroupedListItem.Provider>
  );
}

export function useInGroupedListItem(): boolean {
  return useContext(InGroupedListItem);
}
