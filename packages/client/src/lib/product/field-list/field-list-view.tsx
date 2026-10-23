import { List } from '@repo/kit/primitives/lists/list';
import type { ReactElement, ReactNode } from 'react';
import type { FieldListSection } from './field-list-entries';

export type { FieldListSection } from './field-list-entries';

export interface FieldListProps {
  sections: readonly FieldListSection[];
  testID?: string;
  gap?: 'sm';
  // Drawn above the sections and scrolled with them.
  header?: ReactNode;
}

export function FieldList(props: FieldListProps): ReactElement {
  return (
    <List
      fit={false}
      appearance="cards"
      testID={props.testID}
      header={props.header}
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
