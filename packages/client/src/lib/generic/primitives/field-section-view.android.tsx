import { Column, Text } from '@expo/ui/jetpack-compose';
import {
  clip,
  fillMaxWidth,
  padding,
  Shapes,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '../native-theme';
import { useWide } from '../use-wide';
import type { FieldSectionProps } from './field-props';
import { FieldSection as WebFieldSection } from './field-section-view.tsx';

const sectionRadius = 20;
const gutter = 16;
const captionPadding = 4;

export function FieldSection(props: FieldSectionProps): React.JSX.Element {
  if (useWide()) return <WebFieldSection {...props} />;
  return (
    <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxWidth()]}>
      <SectionCaption text={props.title} />
      <Column
        verticalArrangement={{ spacedBy: 1 }}
        modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(sectionRadius))]}
      >
        {props.children}
      </Column>
      <SectionCaption text={props.footer} />
    </Column>
  );
}

function SectionCaption({ text }: { text?: string }): React.JSX.Element | null {
  const { mutedForeground } = useNativeTheme().colors;
  if (!text) return null;
  return (
    <Text
      color={mutedForeground}
      style={{ typography: 'bodyMedium' }}
      modifiers={[padding(gutter, captionPadding, gutter, captionPadding)]}
    >
      {text}
    </Text>
  );
}
