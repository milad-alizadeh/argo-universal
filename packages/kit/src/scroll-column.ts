import { createContext, use, useMemo } from 'react';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

/*
 * The column a pane's scrolled content keeps to. The pane's scroll view spans the whole pane, so
 * its scrollbar and fades sit at the pane's edges, and its content stays in this column inside it.
 */
interface ScrollColumn {
  // The column's widest, its padding included; it centres in a wider pane.
  maxWidth?: number;
  paddingLeft: number;
  paddingRight: number;
}

// Set by a pane around its scroll view; the scroll view takes it and clears it, so nothing nested in it or opened from it takes it again.
export const ScrollColumnContext = createContext<ScrollColumn | undefined>(
  undefined,
);

const numericPadding = (value: ViewStyle['paddingLeft']): number =>
  typeof value === 'number' ? value : 0;

function inColumn(column: ScrollColumn, own: StyleProp<ViewStyle>): ViewStyle {
  const style = StyleSheet.flatten(own) ?? {};

  return {
    ...style,
    width: '100%',
    maxWidth: column.maxWidth,
    // Auto margins centre it whether or not its scroll view lays it out as a flex item, as Legend List's web build does not.
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: numericPadding(style.paddingLeft) + column.paddingLeft,
    paddingRight: numericPadding(style.paddingRight) + column.paddingRight,
  };
}

// A scroll view's content container style inside the pane's column: its own padding sits inside the column's.
export function useScrollColumnStyle(
  own?: StyleProp<ViewStyle>,
): StyleProp<ViewStyle> {
  const column = use(ScrollColumnContext);

  return useMemo(() => (column ? inColumn(column, own) : own), [column, own]);
}
