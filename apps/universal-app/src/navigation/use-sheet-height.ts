import { useFocusEffect, useNavigation } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useCallback, useRef } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// A page of a nested native stack measures the sheet, including its header; its content includes the bottom safe area.
export function useSheetHeight(
  minimumHeight = 0,
): (contentHeight: number) => void {
  return useRefitOnFocus(useFitSheet(minimumHeight));
}

function useFitSheet(minimumHeight: number): (contentHeight: number) => void {
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const { height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  return useCallback(
    (contentHeight: number) => {
      const fitted = Math.min(
        height,
        Math.max(minimumHeight, contentHeight + headerHeight),
      );
      navigation
        .getParent()
        ?.setOptions(
          Platform.OS === 'android'
            ? { contentStyle: { height: fitted - top } }
            : { sheetAllowedDetents: [fitted / height, 1] },
        );
    },
    [navigation, headerHeight, height, top, minimumHeight],
  );
}

// Android's sheet picks the list it scrolls only when it resizes, so a page fits it again when it comes back.
function useRefitOnFocus(
  fit: (contentHeight: number) => void,
): (contentHeight: number) => void {
  const lastContentHeight = useRef<number>(null);
  useFocusEffect(
    useCallback(() => {
      if (lastContentHeight.current !== null) fit(lastContentHeight.current);
    }, [fit]),
  );
  return useCallback(
    (contentHeight: number) => {
      lastContentHeight.current = contentHeight;
      fit(contentHeight);
    },
    [fit],
  );
}
