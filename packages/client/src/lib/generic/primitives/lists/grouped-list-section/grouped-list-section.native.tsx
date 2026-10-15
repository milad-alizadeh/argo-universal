import { Column, FieldGroup } from '@expo/ui';
import { fillMaxWidth, padding } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { useSidebarList } from '#primitives/fields/field-layout';
import {
  NativeText,
  type NativeTextRole,
} from '#primitives/native/native-text';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListSectionProps } from './grouped-list-section-props';
import { GroupedListSection as WebGroupedListSection } from './grouped-list-section.tsx';

const gutter = 16;

const captionPadding = 4;

const captionGap = 8;

const ios = Platform.OS === 'ios';

export function GroupedListSection(
  props: GroupedListSectionProps,
): React.JSX.Element {
  const bare = useBareSection(props);

  if (useWide()) return <WebGroupedListSection {...props} />;

  return bare ? <BareSection {...props} /> : <Section {...props} />;
}

// Android's Section puts every row on a filled tile; bare fields and a flat sidebar want none.
function useBareSection(props: GroupedListSectionProps): boolean {
  const sidebar = useSidebarList();

  return !ios && (!!props.textFields || sidebar);
}

// The Section draws its own title, in the platform's header style.
function Section(props: GroupedListSectionProps): React.JSX.Element {
  return (
    <FieldGroup.Section title={props.title}>
      {footerSlot(props)}
      {props.children}
    </FieldGroup.Section>
  );
}

// The Section finds its footer by the slot element's type, so this is called, not rendered as a component.
function footerSlot(props: GroupedListSectionProps): React.ReactNode {
  if (!props.footer) return null;

  return (
    <FieldGroup.SectionFooter>
      <NativeText role="secondary" tone={props.tone}>
        {props.footer}
      </NativeText>
    </FieldGroup.SectionFooter>
  );
}

/*
 * Android's text fields stand bare, apart by Material's field spacing, each saying its own hint or
 * error, so the section draws no footer; a sidebar's rows sit flat and together.
 */
function BareSection(props: GroupedListSectionProps): React.JSX.Element {
  const footer = props.textFields ? undefined : props.footer;

  return (
    <Column spacing={captionGap} modifiers={fullWidth}>
      <Caption text={props.title} textRole="heading" />
      <Column spacing={useRowGap(props.textFields)} modifiers={fullWidth}>
        {props.children}
      </Column>
      <Caption text={footer} textRole="secondary" />
    </Column>
  );
}

const fullWidth = [fillMaxWidth()];

function useRowGap(textFields: boolean | undefined): number {
  const { gap } = useResolveClassNames('gap-4');

  return textFields && typeof gap === 'number' ? gap : 0;
}

function Caption(props: {
  text?: string;
  textRole: NativeTextRole;
}): React.JSX.Element | null {
  if (!props.text) return null;

  return (
    <NativeText
      role={props.textRole}
      modifiers={[padding(gutter, captionPadding, gutter, captionPadding)]}
    >
      {props.text}
    </NativeText>
  );
}

GroupedListSection satisfies React.ComponentType<GroupedListSectionProps>;
