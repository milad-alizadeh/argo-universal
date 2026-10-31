import type { ViewStyle } from 'react-native';

/*
 * `sticky` is a web position React Native's own styles do not name, so the web's own file is where it is
 * written: React Native Web passes the value straight through to CSS.
 */
type StickyStyle = Omit<ViewStyle, 'position'> & { position: 'sticky' };

export const stickyColumnStyle: StickyStyle = { position: 'sticky', top: 0 };
