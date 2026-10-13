import { useFocusEffect, useNavigation } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useCallback, useRef } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/*
 * A page of a nested native stack measures the sheet, including its header and bottom safe area, and fits it again when it comes back.
 * Android's sheet picks the list it scrolls only when it resizes, so a pushed page that overflows must resize it.
 */
export function useSheetHeight(
  minimumHeight = 0,
): (contentHeight: number) => void {
  const navigation = useNavigation();
  const lastContentHeight = useRef<number>(null);
  const headerHeight = useHeaderHeight();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fit = useCallback(
    (contentHeight: number) => {
      lastContentHeight.current = contentHeight;
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
  useFocusEffect(
    useCallback(() => {
      if (lastContentHeight.current !== null)
        fit(lastContentHeight.current);
    }, [fit]),
  );
  return fit;
}
