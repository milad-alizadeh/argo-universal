import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View, type ViewProps } from 'react-native';
import type { BottomSheetProps } from './bottom-sheet-props';

const SheetContext = createContext<(open: boolean) => void>(() => {});

export function BottomSheetRoot(
  props: Pick<BottomSheetProps, 'style' | 'open' | 'onOpenChange'> &
    Pick<ViewProps, 'onLayout'> & {
      children: ReactNode;
    },
): ReactElement {
  return (
    <SheetContext.Provider value={props.onOpenChange}>
      <View style={props.style} onLayout={props.onLayout}>
        {props.children}
      </View>
    </SheetContext.Provider>
  );
}

export function useSheetOpenChange(): (open: boolean) => void {
  return useContext(SheetContext);
}
