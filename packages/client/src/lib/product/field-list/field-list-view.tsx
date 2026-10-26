import { List } from '@repo/kit/primitives/lists/list';
import type { ReactElement, ReactNode } from 'react';
import type { FieldListSection } from './field-list-entries';

export type { FieldListSection } from './field-list-entries';

export interface FieldListProps {
  sections: readonly FieldListSection[];
  testID?: string;
  // Drawn above the sections and scrolled with them.
  header?: ReactNode;
  // The header scrolls sideways to the edges instead of lining up with the cards.
  headerBleeds?: boolean;
}

export function FieldList(props: FieldListProps): ReactElement {
  return (
    <List
      fit={false}
      appearance="cards"
      testID={props.testID}
      header={props.header}
      headerBleeds={props.headerBleeds}
    >
      {props.sections.map(sectionView)}
    </List>
  );
}

function sectionView(section: FieldListSection, index: number): ReactElement {
  return (
    <List.Section
      key={section.title ?? index}
      title={section.title}
      footer={section.footer}
    >
      {section.rows}
    </List.Section>
  );
}
