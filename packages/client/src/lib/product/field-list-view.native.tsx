import type * as React from 'react';
import { FieldGroup } from '#primitives/field-group';
import { FieldSection } from '#primitives/field-section';
import { useWide } from '../generic/use-wide';
import {
  type FieldListProps,
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
    <FieldGroup>
      {props.sections.map((section, index) => (
        <FieldSection
          key={section.title ?? `section-${index}`}
          title={section.title}
          footer={section.footer}
        >
          {section.rows}
        </FieldSection>
      ))}
    </FieldGroup>
  );
}
