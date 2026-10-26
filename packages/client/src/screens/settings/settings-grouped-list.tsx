import { List, type ListProps } from '@repo/kit/primitives/lists/list';
import type * as React from 'react';

export type SettingsGroupedListProps = Pick<
  ListProps<never>,
  'children' | 'fit' | 'padding'
>;

/*
 * A Settings data list (ADR-0042): `List appearance="grouped"` of `List.Section`s of FieldGroup rows. The web draws it
 * on LegendList; a phone's file draws the same sections natively, since FieldGroup rows are SwiftUI and Compose views
 * that only a native list can hold.
 */
export function SettingsGroupedList(
  props: SettingsGroupedListProps,
): React.JSX.Element {
  return <List appearance="grouped" {...props} />;
}
