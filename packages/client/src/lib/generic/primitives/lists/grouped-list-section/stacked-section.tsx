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
import { NativeText } from '#primitives/display/native-text';
import { stackedCellGutter } from '#primitives/lists/grouped-list-item';
import { roundedFill } from '#primitives/native/native-modifiers';
import type { GroupedListSectionProps } from './grouped-list-section-props';

// An inset-grouped Form's card corner, and the space between its caption and card.
const cardCorner = 26;

const captionGap = 8;

/*
 * A Form section drawn without a Form: the caption, a card of rows, and the footer.
 * Each row draws its separator under it, so the card hides the last one past its bottom edge
 * (padding and clipShape in modifiers/index.d.ts; background(style, shape) in background.d.ts).
 */
export function StackedSection(props: GroupedListSectionProps): ReactElement {
  return (
    <VStack alignment="leading" spacing={captionGap} modifiers={fullWidth}>
      <Caption text={props.title} />
      <VStack alignment="leading" spacing={0} modifiers={useCardModifiers()}>
        {props.children}
      </VStack>
      <Caption text={props.footer} tone={props.tone} />
    </VStack>
  );
}

const fullWidth = [frame({ maxWidth: Infinity, alignment: 'leading' })];

function useCardModifiers(): ModifierConfig[] {
  const { card } = useNativeTheme().colors;

  return [
    ...fullWidth,
    padding({ bottom: -1 }),
    ...roundedFill(card, cardCorner),
  ];
}

type CaptionProps = { text?: string; tone?: GroupedListSectionProps['tone'] };

// The Form's caption: footnote type in the secondary colour, in line with the rows' text.
function Caption({ text, tone }: CaptionProps): ReactElement | null {
  if (!text) return null;

  return (
    <NativeText
      tone={tone}
      modifiers={[
        font({ textStyle: 'footnote' }),
        foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
        padding({ horizontal: stackedCellGutter }),
      ]}
    >
      {text}
    </NativeText>
  );
}
