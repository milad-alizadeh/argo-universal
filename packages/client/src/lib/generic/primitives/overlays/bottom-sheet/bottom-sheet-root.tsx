import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import type { BottomSheetProps } from './bottom-sheet.types';

const SheetContext = createContext<(open: boolean) => void>(() => {});

export function BottomSheetRoot(
  props: Pick<BottomSheetProps, 'style' | 'open' | 'onOpenChange'> & {
    children: ReactNode;
  },
): ReactElement {
  return (
    <SheetContext.Provider value={props.onOpenChange}>
      <View style={props.style}>{props.children}</View>
    </SheetContext.Provider>
  );
}

export function useSheetOpenChange(): (open: boolean) => void {
  return useContext(SheetContext);
}
