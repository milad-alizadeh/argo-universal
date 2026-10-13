import { isLiquidGlassAvailable } from 'expo-glass-effect';

// The system draws Liquid Glass only on iOS 26 or later in an App built with the iOS 26 SDK.
export const liquidGlassAvailable = isLiquidGlassAvailable();
