import { Children, type ReactNode } from 'react';
import { flattenedChildren } from '#kit/flattened-children';
import { RowFrame } from '#primitives/fields/field-row';

/*
 * Expo's web Section sets each row in a 48px frame with no vertical padding inside a clipping card, so a Slider's
 * focus ring is cut off. Each row gets a taller frame of its own, with room above and below its content.
 */
export function sectionRows(children: ReactNode): ReactNode {
  return Children.map(flattenedChildren(children), (row) => (
    <RowFrame>{row}</RowFrame>
  ));
}
