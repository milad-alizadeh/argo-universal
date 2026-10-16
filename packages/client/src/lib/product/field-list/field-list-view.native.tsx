import type * as React from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListContent } from '#primitives/lists/grouped-list-content';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
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
export function FieldList(props: FieldListProps): React.JSX.Element {
  if (useWide()) return <VirtualFieldList {...props} />;

  return (
    <GroupedList gap={props.gap}>
      {props.sections.map((section, index) => (
        <NativeGroupedListSection
          key={section.title ?? `section-${index}`}
          section={section}
        />
      ))}
    </GroupedList>
  );
}

function NativeGroupedListSection(props: {
  section: FieldListSection;
}): React.JSX.Element {
  if (props.section.plain)
    return <GroupedListContent>{props.section.rows}</GroupedListContent>;

  return (
    <GroupedListSection
      title={props.section.title}
      footer={props.section.footer}
    >
      {props.section.rows}
    </GroupedListSection>
  );
}
