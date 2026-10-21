import type { PressableAndroidRippleConfig } from 'react-native';
import { useMaterialPalette } from './material-palette';

// A Pressable's `android_ripple`: the stock ripple in Argo's pressed tint.
export function usePressRipple(): PressableAndroidRippleConfig {
  return useMaterialPalette().ripple;
}
