import {
  type NativeStackNavigationOptions,
  useFocusEffect,
  useNavigation,
} from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useCallback, useMemo, useRef } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FitSheet = (contentHeight: number) => void;

interface SheetFrame {
  minimumHeight: number;
  windowHeight: number;
  headerHeight: number;
  topInset: number;
}

// The content already includes the bottom safe area.
function sheetOptions(
  contentHeight: number,
  frame: SheetFrame,
): NativeStackNavigationOptions {
  const fittedHeight = Math.min(
    frame.windowHeight,
    Math.max(frame.minimumHeight, contentHeight + frame.headerHeight),
  );

  return Platform.OS === 'android'
    ? { contentStyle: { height: fittedHeight - frame.topInset } }
    : { sheetAllowedDetents: [fittedHeight / frame.windowHeight, 1] };
}

function useSheetFrame(minimumHeight: number): SheetFrame {
  const headerHeight = useHeaderHeight();
  const windowHeight = useWindowDimensions().height;
  const { top: topInset } = useSafeAreaInsets();

  return useMemo(
    () => ({ minimumHeight, windowHeight, headerHeight, topInset }),
    [minimumHeight, windowHeight, headerHeight, topInset],
  );
}

// A page of a nested native stack measures the sheet, including its header; its content includes the bottom safe area.
export function useSheetHeight(minimumHeight = 0): FitSheet {
  return useRefitOnFocus(useFitSheet(minimumHeight));
}

function useFitSheet(minimumHeight: number): FitSheet {
  const navigation = useNavigation();
  const frame = useSheetFrame(minimumHeight);

  return useCallback(
    (contentHeight: number) => {
      navigation.getParent()?.setOptions(sheetOptions(contentHeight, frame));
    },
    [navigation, frame],
  );
}

// Android's sheet picks the list it scrolls only when it resizes, so a page fits it again when it comes back.
function useRefitOnFocus(fit: FitSheet): FitSheet {
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
