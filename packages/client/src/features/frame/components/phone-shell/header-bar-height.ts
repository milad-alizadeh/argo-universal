import { hasLiquidGlass } from '#lib/generic/native-header';

// The navigation bar's height under the status bar. Before iOS 26 its items sit higher, 17.5pt below the status bar (measured on iOS 18).
const liquidGlassBar = 44;

const classicBar = 35;

export const headerBarHeight = hasLiquidGlass ? liquidGlassBar : classicBar;
