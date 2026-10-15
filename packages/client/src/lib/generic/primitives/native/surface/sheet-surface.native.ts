import { Platform, PlatformColor, type ViewStyle } from 'react-native';

/*
 * An iOS sheet is the stock grouped background (UIColor.systemGroupedBackground, through React
 * Native's PlatformColor), the colour SwiftUI's Form draws under a grouped list, so a list in the
 * sheet shows no box of its own. It overrides the page class; Android keeps the page class.
 */
export const sheetSurfaceStyle: ViewStyle | undefined =
  Platform.OS === 'ios'
    ? { backgroundColor: PlatformColor('systemGroupedBackground') }
    : undefined;
