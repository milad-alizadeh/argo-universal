import type * as React from 'react';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { useWide } from '../../generic/use-wide/use-wide';
import {
  type FieldListProps,
  type FieldListSection,
  FieldList as VirtualFieldList,
} from './field-list-view.tsx';

export type { FieldListProps, FieldListSection } from './field-list-view.tsx';

/*
 * A phone draws the sections in GroupedList's native list: a SwiftUI Form on iOS, which renders
 * its rows lazily, and Compose on Android. A wide window shares the web's virtualised list.
 */
const sectionKey = (section: FieldListSection, index: number): string =>
  section.title ?? `section-${index}`;

export function FieldList(props: FieldListProps): React.JSX.Element {
  if (useWide()) return <VirtualFieldList {...props} />;

  return (
    <GroupedList search={props.search}>
      {props.sections.map((section, index) => (
        <GroupedListSection key={sectionKey(section, index)} {...section}>
          {section.rows}
        </GroupedListSection>
      ))}
    </GroupedList>
  );
}
