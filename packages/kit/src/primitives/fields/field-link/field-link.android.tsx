import type { ReactElement } from 'react';
import type { FieldGroupKitProps } from '../../kit-props';
import {
  RowListItem,
  rowListItemProps,
} from '../field-row/field-row-list-item.android';

// A pressable ListItem. Android's Settings draws no disclosure chevron on a row that opens a page.
export function FieldLink(
  props: FieldGroupKitProps<'FieldGroup.Link'>,
): ReactElement {
  return <RowListItem {...rowListItemProps(props)} onPress={props.onPress} />;
}
