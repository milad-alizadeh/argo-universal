import type { ViewStyle } from 'react-native';

/*
 * A Detail's Metadata column follows the content as it scrolls, so a long page keeps its properties in view. Only the
 * web, and the desktop that draws with it, can hold a column in place inside a scroll view; a phone stacks instead.
 */
export const stickyColumnStyle: ViewStyle | undefined = undefined;
