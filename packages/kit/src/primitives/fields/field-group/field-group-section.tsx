import { FieldGroup as ExpoFieldGroup } from '@expo/ui';
import type { ReactElement, ReactNode } from 'react';
import { flattenedChildren } from '#kit/flattened-children';
import { NativeText } from '#primitives/content/native-text';
import { expandInlinePickers } from '#primitives/fields/field-picker';
import type { FieldGroupKitProps } from '../../kit-props';
import { sectionRows } from './field-group-rows';

export type FieldGroupSectionProps =
  FieldGroupKitProps<'FieldGroup.Section'> & { children?: ReactNode };

// Expo UI's FieldGroup.Section, its title and footer in its header and footer slots in the kit's type roles.
export function FieldGroupSection(props: FieldGroupSectionProps): ReactElement {
  return sectionElement(props);
}

export function sectionElement(props: FieldGroupSectionProps): ReactElement {
  return (
    <ExpoFieldGroup.Section>
      {sectionTitle(props.title)}
      {sectionRows(expandInlinePickers(flattenedChildren(props.children)))}
      {sectionFooter(props.footer)}
    </ExpoFieldGroup.Section>
  );
}

const titleRole = 'heading';

// Called, not rendered: Expo finds the header and footer slots by element type.
function sectionTitle(title: string | undefined): ReactNode {
  if (!title) return null;

  return (
    <ExpoFieldGroup.SectionHeader>
      <NativeText role={titleRole}>{title}</NativeText>
    </ExpoFieldGroup.SectionHeader>
  );
}

function sectionFooter(footer: string | undefined): ReactNode {
  if (!footer) return null;

  return (
    <ExpoFieldGroup.SectionFooter>
      <NativeText role="secondary" tone="muted">
        {footer}
      </NativeText>
    </ExpoFieldGroup.SectionFooter>
  );
}
