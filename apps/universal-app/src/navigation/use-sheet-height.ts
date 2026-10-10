import { useNavigation } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// A sheet with a native header cannot fit itself to its contents, so its first page sizes it; it still drags to full height.
export function useSheetHeight(): (contentHeight: number) => void {
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (contentHeight) =>
    navigation.getParent()?.setOptions({
      sheetAllowedDetents: [
        Math.min(1, (contentHeight + headerHeight + insets.bottom) / height),
        1,
      ],
    });
}
