import { Platform, useWindowDimensions } from 'react-native';
import { useSheetHeight } from './use-sheet-height';

const minimumHeight = { ios: 414, android: 476 };

// Every page of the Configure sheet keeps at least Configure's height, so a short page does not shrink it.
export function useConfigureSheetHeight(): (contentHeight: number) => void {
  const { fontScale } = useWindowDimensions();

  return useSheetHeight(
    (Platform.OS === 'ios' ? minimumHeight.ios : minimumHeight.android) *
      fontScale,
  );
}
