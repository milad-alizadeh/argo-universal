import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import type { ContentColumn } from './column-layout';

const numericPadding = (value: ViewStyle['paddingLeft']): number =>
  typeof value === 'number' ? value : 0;

// A scroll view's content inside the column: its own padding sits inside the column's.
export function inColumn(
  column: ContentColumn | undefined,
  own: StyleProp<ViewStyle>,
): StyleProp<ViewStyle> {
  if (!column) return own;
  const style = StyleSheet.flatten(own) ?? {};

  return {
    ...style,
    width: '100%',
    maxWidth: column.maxWidth,
    // Auto margins centre it whether or not its scroll view lays it out as a flex item, as Legend List's web build does not.
    marginLeft: 'auto',
    marginRight: 'auto',
    ...paddingInside(style, column),
  };
}

const paddingInside = (style: ViewStyle, column: ContentColumn): ViewStyle => ({
  paddingLeft: numericPadding(style.paddingLeft) + column.paddingLeft,
  paddingRight: numericPadding(style.paddingRight) + column.paddingRight,
});
