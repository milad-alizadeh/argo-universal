import { Section, Text } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  foregroundStyle,
  headerProminence,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useSwiftUITextModifiers } from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListSectionProps } from './grouped-list-section-props';
import { GroupedListSection as WebGroupedListSection } from './grouped-list-section.tsx';

export function GroupedListSection(
  props: GroupedListSectionProps,
): React.JSX.Element {
  if (useWide()) return <WebGroupedListSection {...props} />;

  // Increased prominence preserves title case; the header sets its own font.
  return (
    <Section
      modifiers={[headerProminence('increased')]}
      header={<SectionHeader title={props.title} />}
      footer={<SectionFooter text={props.footer} tone={props.footerTone} />}
    >
      {props.children}
    </Section>
  );
}

function SectionHeader({
  title,
}: {
  title?: string;
}): React.JSX.Element | null {
  return title ? <HeaderText title={title} /> : null;
}

function HeaderText({ title }: { title: string }): React.JSX.Element {
  const headingModifiers = useSwiftUITextModifiers('heading');

  return (
    <Text
      modifiers={[
        ...headingModifiers,
        foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
        accessibilityAddTraits(['isHeader']),
      ]}
    >
      {title}
    </Text>
  );
}

function SectionFooter({
  text,
  tone,
}: {
  text?: string;
  tone?: GroupedListSectionProps['footerTone'];
}): React.JSX.Element | null {
  const modifiers = useFooterModifiers(tone);

  return text ? <Text modifiers={modifiers}>{text}</Text> : null;
}

// A failure, such as a field's error, reads in the destructive colour.
function useFooterModifiers(
  tone: GroupedListSectionProps['footerTone'],
): ReturnType<typeof useSwiftUITextModifiers> {
  const secondaryModifiers = useSwiftUITextModifiers('secondary');
  const { destructive } = useNativeTheme().colors;

  return tone === 'destructive' && destructive
    ? [...secondaryModifiers, foregroundStyle(destructive)]
    : secondaryModifiers;
}

GroupedListSection satisfies React.ComponentType<GroupedListSectionProps>;
