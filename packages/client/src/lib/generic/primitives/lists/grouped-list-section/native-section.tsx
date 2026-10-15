// SwiftUI's grouped Form supplies the section drawing; Android composes public ListItem controls.
import { FieldGroup, Text } from '@expo/ui';
import {
  foregroundStyle,
  listRowBackground,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
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
      <Footer {...props} />
    </FieldGroup.SectionFooter>
  );
}

function Footer(props: GroupedListSectionProps): ReactElement {
  const { danger } = useNativeTheme().colors;
  const color = props.tone === 'danger' ? danger : undefined;

  return (
    <Text modifiers={color ? [foregroundStyle(color)] : []}>
      {props.footer}
    </Text>
  );
}
