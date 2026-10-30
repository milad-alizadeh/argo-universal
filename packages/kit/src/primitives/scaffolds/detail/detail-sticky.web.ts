import type { ViewStyle } from 'react-native';

// `sticky` is a web position React Native's own styles do not name, so the web's own file is where it is written.
export const stickyColumnStyle = {
  position: 'sticky',
  top: 0,
} as unknown as ViewStyle;
