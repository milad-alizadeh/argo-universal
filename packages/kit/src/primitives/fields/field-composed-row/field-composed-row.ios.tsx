import { Column } from '@expo/ui';
import type { ReactElement, ReactNode } from 'react';
import { RowContent } from './field-composed-row-content';
import { rowNodes } from './field-composed-row-nodes';

/*
 * A SwiftUI Form row of the Plugin's own: a VStack of what its children draw, with no divider inside it, so a name,
 * its switch and a slider read as one row. The Form draws the row's surface, insets and separators.
 */
export function FieldComposedRow(props: {
  children?: ReactNode;
}): ReactElement {
  return (
    <Column>
      <RowContent nodes={rowNodes(props.children)} inRow={false} />
    </Column>
  );
}
