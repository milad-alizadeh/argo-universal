import { getFieldItemPosition } from '@expo/ui';
import { Column } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '#kit/flattened-children';
import { Button } from '#primitives/actions/button';
import { expandInlinePickers } from '#primitives/fields/field-picker';
import { PositionContext } from '#primitives/fields/field-row';
import { ButtonCard } from './field-group-button-card.android';
import {
  caption,
  footerInsets,
  rowSpacing,
  titleInsets,
} from './field-group-caption-insets';
import { Caption } from './field-group-caption.android';
import type { FieldGroupSectionProps } from './field-group-section';

/*
 * A copy of Expo UI's Android FieldGroup.Section (FieldSection.android.tsx): the title, then a 2dp-spaced column
 * of rows, then the footer. The one change is that each row is drawn as itself (field-row-list-item.android.tsx)
 * instead of inside a ListItem headline; the Section only tells it where it sits. A Button gets a card of its
 * own, as Expo's Section gives every child. Each child is one row, as on the other platforms (see
 * FieldGroupSectionProps).
 */
const headingSpacing = 4;

export function FieldGroupSection(props: FieldGroupSectionProps): ReactElement {
  return (
    <Column
      verticalArrangement={{ spacedBy: headingSpacing }}
      modifiers={[fillMaxWidth()]}
    >
      <Caption {...caption(props.title, titleInsets, 'heading')} />
      <Rows>{props.children}</Rows>
      <Caption {...caption(props.footer, footerInsets, 'secondary')} />
    </Column>
  );
}

function Rows(props: { children: ReactNode }): ReactNode {
  const rows = expandInlinePickers(flattenedChildren(props.children)).filter(
    isValidElement,
  );

  if (rows.length === 0) return null;

  return (
    <Column
      verticalArrangement={{ spacedBy: rowSpacing }}
      modifiers={[fillMaxWidth()]}
    >
      {positioned(rows)}
    </Column>
  );
}

const positioned = (rows: ReactElement[]): ReactElement[] =>
  rows.map((row, index) => (
    <PositionContext.Provider
      key={row.key}
      value={getFieldItemPosition(index, rows.length)}
    >
      {carded(row)}
    </PositionContext.Provider>
  ));

// Every row draws its own card; a Button, which isn't a row, gets one from the section.
const carded = (row: ReactElement): ReactElement =>
  row.type === Button ? <ButtonCard>{row}</ButtonCard> : row;
