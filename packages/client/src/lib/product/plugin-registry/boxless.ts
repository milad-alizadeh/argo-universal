import { Platform, type ViewStyle } from 'react-native';

/*
 * A wrapper must not move what it holds. Web draws it with no box of its own, so a flex child keeps its width and a
 * list keeps filling its screen; native has no such display, so its wrapper keeps a box and fills where its node does.
 */
export const boxless: ViewStyle | undefined =
  Platform.OS === 'web' ? { display: 'contents' } : undefined;
