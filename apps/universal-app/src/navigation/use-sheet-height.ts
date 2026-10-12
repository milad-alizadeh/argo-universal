import { useNavigation } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useCallback } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// A nested native stack needs its first page to measure the sheet, including its header and bottom safe area.
export function useSheetHeight(
  minimumHeight = 0,
): (contentHeight: number) => void {
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return useCallback(
    (contentHeight: number) => {
      const fittedHeight = Math.min(
        height,
        Math.max(minimumHeight, contentHeight + headerHeight + insets.bottom),
      );
      navigation.getParent()?.setOptions(
        Platform.OS === 'android'
          ? {
              contentStyle: { height: fittedHeight - insets.top },
            }
          : { sheetAllowedDetents: [fittedHeight / height, 1] },
      );
    },
    [
      navigation,
      headerHeight,
      height,
      insets.bottom,
      insets.top,
      minimumHeight,
    ],
  );
}
