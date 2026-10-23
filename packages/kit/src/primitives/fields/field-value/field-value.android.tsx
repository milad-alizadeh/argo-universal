import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import type { FieldGroupKitProps } from '../../kit-props';
/* oxlint-disable-next-line no-restricted-imports -- the Android-only drawing stays out of the folder's index so the web never loads Compose. */
import {
  RowListItem,
  rowListItemProps,
} from '../field-row/field-row-list-item.android';

// A Material 3 ListItem: title, leading icon, and the value as trailing text.
export function FieldValue(
  props: FieldGroupKitProps<'FieldGroup.Value'>,
): ReactElement {
  return (
    <RowListItem
      {...rowListItemProps(props)}
      trailing={<NativeText tone="muted">{props.value}</NativeText>}
    />
  );
}
