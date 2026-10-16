import type { PressableAndroidRippleConfig } from 'react-native';

// Only Android draws a press ripple; iOS and the web take the pressed tint instead.
export function usePressRipple(): PressableAndroidRippleConfig | undefined {
  return undefined;
}
