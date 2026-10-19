import type { ReactElement } from 'react';
import { List } from '#primitives/lists/list';
import type { FieldListSection } from './field-list-entries';

export type { FieldListSection } from './field-list-entries';

export interface FieldListProps {
  sections: readonly FieldListSection[];
  testID?: string;
  gap?: 'sm';
}

export function FieldList(props: FieldListProps): ReactElement {
  return (
    <List appearance="grouped" testID={props.testID}>
      {props.sections.map((section, index) => (
        <List.Section
          key={section.title ?? index}
          title={section.title}
          footer={section.footer}
        >
          {section.rows}
        </List.Section>
      ))}
    </List>
  );
}
