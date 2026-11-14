import type { ReactNode } from 'react';
import type { ListLook } from '../../../list-look';
import { isNativeRow } from './list-native-row-mark';
import { nativeSections } from './list-native-sections';
import type { ListProps } from './list-props';

// A grouped List draws natively when every row it holds is a FieldGroup row; ListItem rows stay on LegendList.
function holdsNativeRows(children: ReactNode): boolean {
  const rows = nativeSections(children).flatMap((section) => section.rows);

  return rows.length > 0 && rows.every((row) => isNativeRow(row.render()));
}

// What NativeGroupedList cannot draw: a List that sets any of these stays on LegendList rather than lose them.
const unhonouredProps = [
  'header',
  'startContent',
  'endContent',
  'testID',
  'refreshControl',
  'onEndReached',
  'padding',
  'maxHeight',
] as const satisfies (keyof ListProps<never>)[];

type NativeCandidate = Pick<
  ListProps<never>,
  'children' | (typeof unhonouredProps)[number]
> & { items?: readonly unknown[] };

const asksNothingNativeLacks = (props: NativeCandidate): boolean =>
  unhonouredProps.every((name) => props[name] === undefined);

// Decide before loading decorates a React Native list with a RefreshControl.
export const drawsNativeGroupedList = (
  look: ListLook,
  props: NativeCandidate,
): boolean =>
  look.phone !== undefined &&
  asksNothingNativeLacks(props) &&
  hasNativeChildren(props);

const hasNativeChildren = (
  props: Pick<NativeCandidate, 'items' | 'children'>,
): boolean => props.items === undefined && holdsNativeRows(props.children);
