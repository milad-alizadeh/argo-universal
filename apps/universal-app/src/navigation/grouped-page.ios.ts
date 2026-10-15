import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { PlatformColor } from 'react-native';

/*
 * The stock grouped background (UIColor.systemGroupedBackground, through React Native's
 * PlatformColor) behind the header and content of a screen holding a grouped list, which is the
 * colour SwiftUI's Form draws, so the header meets the list with no seam, in a page or a sheet.
 * An iOS file because the colour is a UIKit name.
 */
const groupedPageOptions = {
  headerStyle: { backgroundColor: PlatformColor('systemGroupedBackground') },
  contentStyle: { backgroundColor: PlatformColor('systemGroupedBackground') },
};

export function useGroupedPage(active: boolean): void {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    if (active) navigation.setOptions(groupedPageOptions);
  }, [active, navigation]);
}
