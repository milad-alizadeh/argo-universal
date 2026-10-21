import { lexer } from 'marked';
import type * as React from 'react';
import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { Blocks } from './block-tokens';
import { MarkdownClamp } from './markdown-clamp';
import type { MarkdownProps } from './markdown-props';
import { MarkdownTone } from './markdown-tone';

// Foundations / Markdown: one prose drawing wherever the kit is used.
export const Markdown = memo(function Markdown({
  text,
  streaming = false,
  tone,
  numberOfLines,
  onOverflowChange,
}: MarkdownProps) {
  return (
    <MarkdownTone value={tone}>
      <MarkdownClamp lines={numberOfLines} onOverflowChange={onOverflowChange}>
        <MarkdownContent text={text} streaming={streaming} />
      </MarkdownClamp>
    </MarkdownTone>
  );
});

function MarkdownContent({
  text,
  streaming = false,
}: MarkdownProps): React.JSX.Element {
  const tokens = useMemo(() => lexer(text), [text]);

  return (
    <View className="max-w-full web:select-text gap-paragraph wide-type:gap-paragraph-wide">
      <Blocks tokens={tokens} caret={streaming} />
    </View>
  );
}
