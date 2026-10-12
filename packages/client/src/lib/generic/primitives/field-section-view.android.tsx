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
import { useNavigationFields } from './field-layout';
import type { FieldSectionProps } from './field-props';
import { FieldSection as WebFieldSection } from './field-section-view.tsx';
import { useComposeTextStyle } from './native-typography';

const sectionRadius = 20;
const gutter = 16;
const captionPadding = 4;

export function FieldSection(props: FieldSectionProps): React.JSX.Element {
  const navigation = useNavigationFields();
  if (useWide()) return <WebFieldSection {...props} />;
  return (
    <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxWidth()]}>
      <SectionCaption text={props.title} heading />
      <Column {...rowsLayout(navigation)}>{props.children}</Column>
      <SectionCaption text={props.footer} tone={props.footerTone} />
    </Column>
  );
}

// A navigation list's rows sit flat and together, like the sidebar's; grouped rows share a rounded card.
function rowsLayout(
  navigation: boolean,
): Pick<
  React.ComponentProps<typeof Column>,
  'verticalArrangement' | 'modifiers'
> {
  if (navigation) return { modifiers: [fillMaxWidth()] };
  return {
    verticalArrangement: { spacedBy: 1 },
    modifiers: [fillMaxWidth(), clip(Shapes.RoundedCorner(sectionRadius))],
  };
}

function SectionCaption({
  text,
  heading,
  tone,
}: {
  text?: string;
  heading?: boolean;
  tone?: FieldSectionProps['footerTone'];
}): React.JSX.Element | null {
  const textStyle = useComposeTextStyle(heading ? 'heading' : 'secondary');
  const color = useCaptionColor(tone);
  if (!text) return null;
  return (
    <Text
      color={color}
      style={textStyle}
      modifiers={[padding(gutter, captionPadding, gutter, captionPadding)]}
    >
      {text}
    </Text>
  );
}

// A failure, such as a field's error, reads in the destructive colour.
function useCaptionColor(
  tone: FieldSectionProps['footerTone'],
): string | undefined {
  const { mutedForeground, destructive } = useNativeTheme().colors;
  return tone === 'destructive' ? destructive : mutedForeground;
}
