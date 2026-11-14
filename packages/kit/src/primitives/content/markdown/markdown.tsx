import type * as React from 'react';
import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { lexMarkdown } from '#kit/lex-markdown';
import { Blocks } from './block-tokens';
import { MarkdownClamp } from './markdown-clamp';
import type { MarkdownProps } from './markdown-props';
import { MarkdownSelectable, MarkdownTone } from './markdown-tone';

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

function MarkdownContent({
  text,
  streaming = false,
}: MarkdownProps): React.JSX.Element {
  const tokens = useMemo(() => lexMarkdown(text), [text]);

  return (
    <View className="max-w-full web:select-text gap-paragraph wide-type:gap-paragraph-wide">
      <Blocks tokens={tokens} caret={streaming} />
    </View>
  );
}
