import { Column, Text } from '@expo/ui/jetpack-compose';
import {
  clip,
  fillMaxWidth,
  padding,
  Shapes,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useResolveClassNames } from 'uniwind';
import { useNativeTheme } from '../../../native-theme';
import { useWide } from '../../../use-wide/use-wide';
import { useComposeTextStyle } from '../../native/native-typography';
import { useNavigationFields } from '../field-layout';
import type { FieldSectionProps } from '../field-props';
import { FieldSection as WebFieldSection } from './field-section-rn';

const sectionRadius = 20;
const gutter = 16;
const captionPadding = 4;

export function FieldSection(props: FieldSectionProps): React.JSX.Element {
  const rows = useRowsLayout(props);
  if (useWide()) return <WebFieldSection {...props} />;
  return (
    <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxWidth()]}>
      <SectionCaption text={props.title} heading />
      <Column {...rows}>{props.children}</Column>
      {props.textFields ? null : (
        <SectionCaption text={props.footer} tone={props.footerTone} />
      )}
    </Column>
  );
}

type RowsLayout = Pick<
  React.ComponentProps<typeof Column>,
  'verticalArrangement' | 'modifiers'
>;

/*
 * A navigation list's rows sit flat and together, like the sidebar's; grouped rows share a rounded card.
 * Text fields stand bare, apart by Material's field spacing, each saying its own hint or error.
 */
function useRowsLayout(props: FieldSectionProps): RowsLayout {
  const navigation = useNavigationFields();
  const { gap } = useResolveClassNames('gap-4');
  if (props.textFields)
    return {
      verticalArrangement: { spacedBy: typeof gap === 'number' ? gap : 0 },
      modifiers: [fillMaxWidth()],
    };
  return groupedLayout(navigation);
}

function groupedLayout(navigation: boolean): RowsLayout {
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
