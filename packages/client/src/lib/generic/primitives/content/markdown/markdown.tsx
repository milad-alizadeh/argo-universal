import { lexer } from 'marked';
import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { Blocks } from './block-tokens';
import type { MarkdownProps } from './markdown-props';
import { MarkdownTone } from './markdown-tone';

// Foundations / Markdown: one prose drawing wherever the kit is used.
export const Markdown = memo(function Markdown({
  text,
  streaming = false,
  tone,
}: MarkdownProps) {
  const tokens = useMemo(() => lexer(text), [text]);

  return (
    <MarkdownTone value={tone}>
      <View className="web:select-text gap-paragraph wide-type:gap-paragraph-wide">
        <Blocks tokens={tokens} caret={streaming} />
      </View>
    </MarkdownTone>
  );
});
