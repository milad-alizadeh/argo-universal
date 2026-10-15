// SwiftUI's grouped Form supplies the section drawing; Android composes public ListItem controls.
import { FieldGroup } from '@expo/ui';
import { listRowBackground } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { NativeText } from '#primitives/display/native-text';
import type { GroupedListSectionProps } from './grouped-list-section-props';

export function NativeSection(props: GroupedListSectionProps): ReactElement {
  const { card } = useNativeTheme().colors;

  return (
    <FieldGroup.Section
      title={props.title}
      modifiers={card ? [listRowBackground(card)] : []}
    >
      {footerSlot(props)}
      {props.children}
    </FieldGroup.Section>
  );
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
