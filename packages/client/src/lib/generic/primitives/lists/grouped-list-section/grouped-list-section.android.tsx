import { Column, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, padding } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useResolveClassNames } from 'uniwind';
import { useSidebarList } from '#primitives/fields/field-layout';
import { roundedClip } from '#primitives/native/native-modifiers';
import { useComposeTextStyle } from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListSectionProps } from './grouped-list-section-props';
import { GroupedListSection as WebGroupedListSection } from './grouped-list-section.tsx';

const sectionRadius = 28;

const gutter = 16;

const captionPadding = 4;

export function GroupedListSection(
  props: GroupedListSectionProps,
): React.JSX.Element {
  const rows = useRowsLayout(props);

  if (useWide()) return <WebGroupedListSection {...props} />;

  return (
    <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxWidth()]}>
      <SectionCaption text={props.title} heading />
      <Column {...rows}>{props.children}</Column>
      {props.textFields ? null : (
        <SectionCaption text={props.footer} tone={props.tone} />
      )}
    </Column>
  );
}

type RowsLayout = Pick<
  React.ComponentProps<typeof Column>,
  'verticalArrangement' | 'modifiers'
>;

/*
 * A sidebar list's rows sit flat and together, like the sidebar's; grouped rows share a rounded card.
 * Text fields stand bare, apart by Material's field spacing, each saying its own hint or error.
 */
function useRowsLayout(props: GroupedListSectionProps): RowsLayout {
  const sidebar = useSidebarList();
  const { gap } = useResolveClassNames('gap-4');

  if (props.textFields)
    return {
      verticalArrangement: { spacedBy: typeof gap === 'number' ? gap : 0 },
      modifiers: [fillMaxWidth()],
    };

  return groupedLayout(sidebar);
}

function groupedLayout(sidebar: boolean): RowsLayout {
  if (sidebar) return { modifiers: [fillMaxWidth()] };

  return {
    verticalArrangement: { spacedBy: 1 },
    modifiers: [fillMaxWidth(), roundedClip(sectionRadius)],
  };
}

type CaptionProps = {
  text?: string;
  heading?: boolean;
  tone?: GroupedListSectionProps['tone'];
};

function SectionCaption(props: CaptionProps): React.JSX.Element | null {
  return props.text ? <CaptionText {...props} text={props.text} /> : null;
}

function CaptionText(
  props: CaptionProps & { text: string },
): React.JSX.Element {
  const captionStyle = useCaptionStyle(props);

  return (
    <Text
      {...captionStyle}
      modifiers={[padding(gutter, captionPadding, gutter, captionPadding)]}
    >
      {props.text}
    </Text>
  );
}

function useCaptionStyle(
  props: Pick<CaptionProps, 'heading' | 'tone'>,
): Pick<React.ComponentProps<typeof Text>, 'color' | 'style'> {
  const style = useComposeTextStyle(props.heading ? 'heading' : 'secondary');

  return { color: useCaptionColor(props.tone), style };
}

// A failure, such as a field's error, reads in the danger colour.
function useCaptionColor(
  tone: GroupedListSectionProps['tone'],
): string | undefined {
  const { mutedForeground, danger } = useNativeTheme().colors;

  return tone === 'danger' ? danger : mutedForeground;
}

GroupedListSection satisfies React.ComponentType<GroupedListSectionProps>;
