import { Platform } from 'react-native';

// react-native-svg forwards `accessible` to the DOM on web, where React rejects a boolean; the parent Pressable already carries the label.
export const svgHiddenProps: { accessible?: false } =
  Platform.OS === 'web' ? {} : { accessible: false };
