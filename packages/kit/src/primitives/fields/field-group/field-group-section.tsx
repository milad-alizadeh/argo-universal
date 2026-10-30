import { FieldGroup as ExpoFieldGroup } from '@expo/ui';
import type { ReactElement, ReactNode } from 'react';
import { flattenedChildren } from '#kit/flattened-children';
import { useInMenu } from '#kit/list-place';
import { NativeText } from '#primitives/content/native-text';
import { expandInlinePickers } from '#primitives/fields/field-picker';
import type { FieldGroupKitProps } from '../../kit-props';
import { MenuSection } from './field-group-menu';
import { sectionRows } from './field-group-rows';

export type FieldGroupSectionProps =
  FieldGroupKitProps<'FieldGroup.Section'> & {
    /*
     * Each child is ONE row: the Section frames it at the row height and draws a separator between it and the next. A
     * component that renders several rows and is passed as a single child is therefore one row to the Section: its rows
     * share one frame, pack at their text's height and get no separators. Nothing warns, because a child's type does not
     * say how many rows it draws. To render several, make each its own child: a keyed list, or a Fragment, which opens in
     * place.
     *
     *   <FieldGroup.Section>
     *     {values.map((value) => (
     *       <FieldGroup.Value key={value.id} title={value.title} value={value.text} />
     *     ))}
     *   </FieldGroup.Section>
     *
     * A component that draws exactly one row (TextRow around a hook, say) is fine.
     */
    children?: ReactNode;
  };

/*
 * Expo UI's FieldGroup.Section, its title and footer in its header and footer slots in the kit's type roles. Each
 * child is one row; see `children` on FieldGroupSectionProps.
 */
export function FieldGroupSection(props: FieldGroupSectionProps): ReactElement {
  const inMenu = useInMenu();

  return inMenu ? <MenuSection {...props} /> : sectionElement(props);
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
