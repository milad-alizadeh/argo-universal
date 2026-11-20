import { Column } from '@expo/ui';
import type { ReactElement, ReactNode } from 'react';
import { RowListItem } from '../field-row/field-row-list-item.android';
import { RowContent } from './field-composed-row-content';
import { stackModifiers } from './field-composed-row-native';
import { rowNodes } from './field-composed-row-nodes';

/*
 * The row's content as the headline of a Material ListItem, drawn as itself in the section's card like every other
 * row, so the card, its corners and its spacing are the Section's.
 */
export function FieldComposedRow(props: {
  children?: ReactNode;
}): ReactElement {
  return (
    <RowListItem
      title=""
      headline={
        <Column modifiers={stackModifiers(false)}>
          <RowContent nodes={rowNodes(props.children)} inRow={false} />
        </Column>
      }
    />
  );
}
