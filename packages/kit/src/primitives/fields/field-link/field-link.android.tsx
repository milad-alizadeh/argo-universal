import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import type { FieldGroupKitProps } from '../../kit-props';
import {
  RowListItem,
  rowListItemProps,
} from '../field-row/field-row-list-item.android';

/*
 * A pressable ListItem with what the page holds as its supporting line, as Android Settings' Preference summary.
 * Android's Settings draws no disclosure chevron on a row that opens a page.
 */
export function FieldLink(
  props: FieldGroupKitProps<'FieldGroup.Link'>,
): ReactElement {
  return (
    <RowListItem
      {...rowListItemProps(props)}
      supporting={summary(props.value)}
      onPress={props.onPress}
    />
  );
}

const summary = (value: string | undefined): ReactElement | undefined =>
  value ? <NativeText tone="muted">{value}</NativeText> : undefined;
