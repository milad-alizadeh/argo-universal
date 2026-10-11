import { Section, Text } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  foregroundStyle,
  headerProminence,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useWide } from '../use-wide';
import type { FieldSectionProps } from './field-props';
import { FieldSection as WebFieldSection } from './field-section-view.tsx';
import { useSwiftUITextModifiers } from './native-typography';

export function FieldSection(props: FieldSectionProps): React.JSX.Element {
  if (useWide()) return <WebFieldSection {...props} />;
  // Increased prominence preserves title case; the header sets its own font.
  return (
    <Section
      modifiers={[headerProminence('increased')]}
      header={<SectionHeader title={props.title} />}
      footer={<SectionFooter text={props.footer} />}
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
  const headingModifiers = useSwiftUITextModifiers('heading');
  if (!title) return null;
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

function SectionFooter({ text }: { text?: string }): React.JSX.Element | null {
  const secondaryModifiers = useSwiftUITextModifiers('secondary');
  return text ? <Text modifiers={secondaryModifiers}>{text}</Text> : null;
}
