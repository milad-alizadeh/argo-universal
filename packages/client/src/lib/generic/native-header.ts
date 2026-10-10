import { Platform } from 'react-native';

const decimalRadix = 10;
const firstLiquidGlassVersion = 26;

// iOS 26 or later, where the system draws Liquid Glass chrome and a transparent header that content scrolls under.
export const hasLiquidGlass =
  Platform.OS === 'ios' &&
  Number.parseInt(String(Platform.Version), decimalRadix) >=
    firstLiquidGlassVersion;
