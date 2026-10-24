import { Switch } from '@expo/ui/jetpack-compose';
import type { ReactElement } from 'react';
import type { FieldGroupKitProps } from '../../kit-props';
import {
  RowListItem,
  toggling,
} from '../field-row/field-row-list-item.android';

/*
 * Android Settings' switch row: a ListItem with the title and a trailing Switch, the whole row toggling. Expo's
 * universal Switch would draw its label in its own row, outside the section's card.
 */
export function FieldToggle(
  props: FieldGroupKitProps<'FieldGroup.Toggle'>,
): ReactElement {
  return (
    <RowListItem
      title={props.title}
      disabled={props.disabled}
      trailing={<Switch value={props.value} enabled={!props.disabled} />}
      modifiers={toggling(props, 'switch')}
    />
  );
}
