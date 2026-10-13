import { type NativeStackNavigationOptions, useNavigation } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useCallback, useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SheetFrame {
  minimumHeight: number;
  windowHeight: number;
  headerHeight: number;
  topInset: number;
  bottomInset: number;
}

function sheetOptions(
  contentHeight: number,
  frame: SheetFrame,
): NativeStackNavigationOptions {
  const fittedHeight = Math.min(
    frame.windowHeight,
    Math.max(
      frame.minimumHeight,
      contentHeight + frame.headerHeight + frame.bottomInset,
    ),
  );
  return Platform.OS === 'android'
    ? { contentStyle: { height: fittedHeight - frame.topInset } }
    : { sheetAllowedDetents: [fittedHeight / frame.windowHeight, 1] };
}

function useSheetFrame(minimumHeight: number): SheetFrame {
  const headerHeight = useHeaderHeight();
  const windowHeight = useWindowDimensions().height;
  const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();
  return useMemo(
    () => ({
      minimumHeight,
      windowHeight,
      headerHeight,
      topInset,
      bottomInset,
    }),
    [minimumHeight, windowHeight, headerHeight, topInset, bottomInset],
  );
}

// A nested native stack needs its first page to measure the sheet, including its header and bottom safe area.
export function useSheetHeight(
  minimumHeight = 0,
): (contentHeight: number) => void {
  const navigation = useNavigation();
  const frame = useSheetFrame(minimumHeight);
  return useCallback(
    (contentHeight: number) => {
      navigation.getParent()?.setOptions(sheetOptions(contentHeight, frame));
    },
    [navigation, frame],
  );
}
