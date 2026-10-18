import { VStack } from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  font,
  foregroundStyle,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { NativeText } from '#primitives/content/native-text';
import { useStackedGutter } from '#primitives/lists/grouped-list-item';
import { roundedFill } from '#primitives/native/native-modifiers';
import type { GroupedListSectionProps } from './grouped-list-section-props';

// An inset-grouped Form's card corner.
const cardCorner = 26;

/*
 * A stock iOS 26 Form's captions, measured: the header in headline type 10 above the card, the
 * footer in footnote type 9 below it, both in the secondary colour and in line with the rows' text.
 */
const captions = {
  header: { textStyle: 'headline', gap: { bottom: 10 } },
  footer: { textStyle: 'footnote', gap: { top: 9 } },
} as const;

/*
 * A Form section drawn without a Form: the caption, a card of rows, and the footer.
 * Each row draws its separator just past its bottom edge, so the card's clip hides the last one
 * (clipShape in modifiers/index.d.ts; background(style, shape) in background.d.ts).
 */
export function StackedSection(props: GroupedListSectionProps): ReactElement {
  return (
    <VStack alignment="leading" spacing={0} modifiers={fullWidth}>
      <Caption text={props.title} edge="header" />
      <VStack alignment="leading" spacing={0} modifiers={useCardModifiers()}>
        {props.children}
      </VStack>
      <Caption text={props.footer} tone={props.tone} edge="footer" />
    </VStack>
  );
}

const fullWidth = [frame({ maxWidth: Infinity, alignment: 'leading' })];

function useCardModifiers(): ModifierConfig[] {
  const { card } = useNativeTheme().colors;

  return [...fullWidth, ...roundedFill(card, cardCorner)];
}

type CaptionProps = {
  text?: string;
  tone?: GroupedListSectionProps['tone'];
  edge: keyof typeof captions;
};

function Caption({ text, tone, edge }: CaptionProps): ReactElement | null {
  const modifiers = useCaptionModifiers(edge);

  if (!text) return null;

  return (
    <NativeText tone={tone} modifiers={modifiers}>
      {text}
    </NativeText>
  );
}

function useCaptionModifiers(edge: CaptionProps['edge']): ModifierConfig[] {
  const gutter = useStackedGutter();
  const { textStyle, gap } = captions[edge];

  return [
    font({ textStyle }),
    foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
    padding({ horizontal: gutter, ...gap }),
  ];
}
