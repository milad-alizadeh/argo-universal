import { lexer } from 'marked';
import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { Blocks } from './block-tokens';
import { MarkdownVariant, type MarkdownVariantName } from './markdown-variant';

export interface FeedMarkdownProps {
  text: string;
  // An open row ends its text with a caret.
  streaming?: boolean;
  variant?: MarkdownVariantName;
}

const blockGaps: Record<MarkdownVariantName, string> = {
  feed: 'gap-paragraph wide-type:gap-paragraph-wide',
  plan: 'gap-2',
  summary: 'gap-paragraph wide-type:gap-paragraph-wide',
};

// Agent markdown drawn with the Feed's own prose, code and table styles.
export const FeedMarkdown = memo(function FeedMarkdown({
  text,
  streaming = false,
  variant = 'feed',
}: FeedMarkdownProps) {
  const tokens = useMemo(() => lexer(text), [text]);

  return (
    <MarkdownVariant.Provider value={variant}>
      <View className={`web:select-text ${blockGaps[variant]}`}>
        <Blocks tokens={tokens} caret={streaming} />
      </View>
    </MarkdownVariant.Provider>
  );
});
