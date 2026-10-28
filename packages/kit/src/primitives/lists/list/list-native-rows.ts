import type { ReactNode } from 'react';
import { isNativeRow } from './list-native-row-mark';
import { nativeSections } from './list-native-sections';
import type { ListProps } from './list-props';

// A grouped List draws natively when every row it holds is a FieldGroup row; ListItem rows stay on LegendList.
export function holdsNativeRows(children: ReactNode): boolean {
  const rows = nativeSections(children).flatMap((section) => section.rows);

  return rows.length > 0 && rows.every((row) => isNativeRow(row.render()));
}

/*
 * What NativeGroupedList cannot draw: a List that sets any of these stays on LegendList rather than lose them.
 * `onMove` is not one: only ListItem rows move, and a native List holds none, so it keeps its native look.
 */
const unhonouredProps = [
  'header',
  'startContent',
  'endContent',
  'testID',
  'refreshControl',
  'onEndReached',
  'accessibilityLabel',
  'padding',
  'maxHeight',
] as const satisfies (keyof ListProps<never>)[];

export const asksNothingNativeLacks = (props: ListProps<never>): boolean =>
  unhonouredProps.every((name) => props[name] === undefined);
