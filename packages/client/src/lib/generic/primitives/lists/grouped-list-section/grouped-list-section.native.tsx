import { Column, FieldGroup, Text } from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import { useSidebarList } from '#primitives/fields/field-layout';
import { useNativeTextExceptions } from '#primitives/native/native-typography';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListSectionProps } from './grouped-list-section-props';
import { GroupedListSection as WebGroupedListSection } from './grouped-list-section.tsx';

const ios = Platform.OS === 'ios';

export function GroupedListSection(
  props: GroupedListSectionProps,
): React.JSX.Element {
  const bare = useBareSection(props);

  if (useWide()) return <WebGroupedListSection {...props} />;

  // Android fields own their hints; sidebar rows own their flat native containers.
  if (bare) return <BareSection {...props} />;

  return (
    <FieldGroup.Section title={props.title}>
      {footerSlot(props)}
      {props.children}
    </FieldGroup.Section>
  );
}

function useBareSection(props: GroupedListSectionProps): boolean {
  const sidebar = useSidebarList();

  return !ios && (!!props.textFields || sidebar);
}

// The Section finds its footer by element type, so the slot is called directly.
function footerSlot(props: GroupedListSectionProps): React.ReactNode {
  return props.footer ? (
    <FieldGroup.SectionFooter>
      <FooterText {...props} />
    </FieldGroup.SectionFooter>
  ) : null;
}

function BareSection(props: GroupedListSectionProps): React.JSX.Element {
  const footer = props.textFields ? undefined : props.footer;

  return (
    <Column modifiers={[fillMaxWidth()]}>
      <FieldGroup.Section title={props.title} />
      {props.children}
      {footer && <FooterText {...props} />}
    </Column>
  );
}

// Only an error overrides the native footer's inherited appearance.
function FooterText(props: GroupedListSectionProps): React.JSX.Element {
  const appearance = useNativeTextExceptions({
    danger: props.tone === 'danger',
  });

  return <Text {...appearance}>{props.footer}</Text>;
}

GroupedListSection satisfies React.ComponentType<GroupedListSectionProps>;
