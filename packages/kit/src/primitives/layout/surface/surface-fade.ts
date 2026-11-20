import { createContext } from 'react';
import type { ViewStyle } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';

/*
 * An animated opacity a container hands its Surfaces instead of fading itself. On the web a glass Surface blurs what
 * lies behind it only while no ancestor is translucent, so a container that faded itself would show the page through
 * its cards unblurred until the fade ended. Each Surface takes the fade on its own material, which keeps the frost.
 */
export const SurfaceFade = createContext<AnimatedStyle<ViewStyle> | null>(null);
