import { Section, Text } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  font,
  foregroundStyle,
  headerProminence,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useWide } from '../use-wide';
import type { FieldSectionProps } from './field-props';
import { FieldSection as WebFieldSection } from './field-section-view.tsx';

export function FieldSection(props: FieldSectionProps): React.JSX.Element {
  if (useWide()) return <WebFieldSection {...props} />;
  // Increased prominence preserves title case; the header sets its own font.
  return (
    <Section
      modifiers={[headerProminence('increased')]}
      header={<SectionHeader title={props.title} />}
      footer={props.footer && <Text>{props.footer}</Text>}
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
  if (!title) return null;
  return (
    <Text
      modifiers={[
        font({ textStyle: 'subheadline', weight: 'semibold' }),
        foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
        accessibilityAddTraits(['isHeader']),
      ]}
    >
      {title}
    </Text>
  );
}
