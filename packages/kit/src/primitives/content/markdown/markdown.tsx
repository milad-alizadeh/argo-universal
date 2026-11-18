import type * as React from 'react';
import { memo, useMemo, useState } from 'react';
import { View } from 'react-native';
import { lexMarkdown } from '#kit/lex-markdown';
import { keepBlockPrefix } from './block-keys';
import { Blocks } from './block-tokens';
import { ArrivalsContext, useArrivals } from './markdown-arrivals';
import { MarkdownClamp } from './markdown-clamp';
import type { MarkdownProps } from './markdown-props';
import { MarkdownSelectable, MarkdownTone } from './markdown-tone';
import { streamingText } from './streaming-text';

// Foundations / Markdown: one prose drawing wherever the kit is used.
export const Markdown = memo(function Markdown({
  tone,
  selectable = false,
  ...rest
}: MarkdownProps) {
  return (
    <MarkdownTone value={tone}>
      <MarkdownSelectable value={selectable}>
        <ClampedContent {...rest} />
      </MarkdownSelectable>
    </MarkdownTone>
  );
});

function ClampedContent({
  numberOfLines,
  onOverflowChange,
  ...content
}: MarkdownProps): React.JSX.Element {
  return (
    <MarkdownClamp lines={numberOfLines} onOverflowChange={onOverflowChange}>
      <MarkdownContent {...content} />
    </MarkdownClamp>
  );
}

function useTokens(
  text: string,
  streaming: boolean,
): ReturnType<typeof keepBlockPrefix> {
  const tokens = useMemo(
    () => lexMarkdown(streaming ? streamingText(text) : text),
    [text, streaming],
  );

  const [drawing, setDrawing] = useState(() => ({ tokens, blocks: tokens }));

  if (tokens === drawing.tokens) return drawing.blocks;

  const blocks = keepBlockPrefix(drawing.blocks, tokens);

  setDrawing({ tokens, blocks });

  return blocks;
}

function MarkdownContent({
  text,
  streaming = false,
}: MarkdownProps): React.JSX.Element {
  const tokens = useTokens(text, streaming);
  const arrivals = useArrivals(streaming);

  return (
    <View className="max-w-full web:select-text gap-paragraph wide-type:gap-paragraph-wide">
      <ArrivalsContext value={arrivals}>
        <Blocks tokens={tokens} streaming={streaming} />
      </ArrivalsContext>
    </View>
  );
}
