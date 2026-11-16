import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View } from 'react-native';

const HandlesOnly = createContext(false);

export function ListDragHandles({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return <HandlesOnly value>{children}</HandlesOnly>;
}

export const useListDragHandles = (): boolean => useContext(HandlesOnly);

export const listDragHandleId = 'list-drag-handle';

export function ListDragHandle({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <View
      testID={listDragHandleId}
      className="pointer-events-auto! web:cursor-grab!"
    >
      {children}
    </View>
  );
}
