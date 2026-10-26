import { PhoneGroupedList } from '@repo/kit/primitives/lists/list';
import type * as React from 'react';
import type { SettingsGroupedListProps } from './settings-grouped-list';

/*
 * A phone's Settings data list (ADR-0042): SwiftUI's `List` or Compose's `LazyColumn` in one Host, holding the
 * `List.Section`s of FieldGroup rows it is given. A FieldGroup row outside a Host fails to mount, which is what a
 * grouped `List` on LegendList did with these rows. The web's `fit` and `padding` have no place on a native list.
 */
export function SettingsGroupedList(
  props: SettingsGroupedListProps,
): React.JSX.Element {
  return <PhoneGroupedList>{props.children}</PhoneGroupedList>;
}
