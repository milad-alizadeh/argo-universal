// SwiftUI's grouped Form supplies the section drawing, or a stacked list draws it; Android composes public ListItem controls.
import { FieldGroup } from '@expo/ui';
import {
  type ModifierConfig,
  listRowBackground,
  listRowSeparatorTint,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { NativeText } from '#primitives/content/native-text';
import { useStackedList } from '#primitives/fields/field-layout';
import { usePaneSectionMargin } from '../../../use-size-class/pane-section-margin';
import type { GroupedListSectionProps } from './grouped-list-section-props';
import { StackedSection } from './stacked-section';

export function NativeSection(props: GroupedListSectionProps): ReactElement {
  return useStackedList() ? (
    <StackedSection {...props} />
  ) : (
    <FormSection {...props} />
  );
}

function FormSection(props: GroupedListSectionProps): ReactElement {
  return (
    <FieldGroup.Section
      title={props.title}
      modifiers={[...useRowColours(), ...usePaneSectionMargin()]}
    >
      {footerSlot(props)}
      {props.children}
    </FieldGroup.Section>
  );
}

// Rows on Argo's card, their separators in Argo's border colour (listRowSeparatorTint in modifiers/index.d.ts).
function useRowColours(): ModifierConfig[] {
  const { card, border } = useNativeTheme().colors;

  return [
    ...(card ? [listRowBackground(card)] : []),
    ...(border ? [listRowSeparatorTint(border)] : []),
  ];
}

// Expo identifies its footer by the slot's element type, so return that slot directly.
function footerSlot(props: GroupedListSectionProps): ReactElement | null {
  if (!props.footer) return null;

  return (
    <FieldGroup.SectionFooter>
      <NativeText role="secondary" tone={props.tone}>
        {props.footer}
      </NativeText>
    </FieldGroup.SectionFooter>
  );
}
