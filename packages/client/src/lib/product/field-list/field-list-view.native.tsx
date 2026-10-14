import type * as React from 'react';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldSection } from '#primitives/fields/field-section';
import { useWide } from '../../generic/use-wide/use-wide';
import {
  type FieldListProps,
  type FieldListSection,
  FieldList as VirtualFieldList,
} from './field-list-view.tsx';

export type { FieldListProps, FieldListSection } from './field-list-view.tsx';

/*
 * A phone draws the sections in FieldGroup's native list: a SwiftUI Form on iOS, which renders
 * its rows lazily, and Compose on Android. A wide window shares the web's virtualised list.
 */
export function FieldList(props: FieldListProps): React.JSX.Element {
  if (useWide()) return <VirtualFieldList {...props} />;

  return (
    <FieldGroup search={props.search}>
      {props.sections.map((section, index) => (
        <NativeFieldSection
          key={section.title ?? `section-${index}`}
          section={section}
        />
      ))}
    </FieldGroup>
  );
}

function NativeFieldSection(props: {
  section: FieldListSection;
}): React.JSX.Element {
  return (
    <FieldSection title={props.section.title} footer={props.section.footer}>
      {props.section.rows}
    </FieldSection>
  );
}
