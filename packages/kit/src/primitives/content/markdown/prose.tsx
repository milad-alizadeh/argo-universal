import type { Token } from 'marked';
import type * as React from 'react';
import { useContext } from 'react';
import { Text, type TextProps } from '#primitives/content/text';
import { Caret } from './caret';
import { useClampLeaf, useLineHeight } from './clamp-leaves';
import { InlineTokens } from './inline-tokens';
import { MarkdownTone } from './markdown-tone';

interface ProseProps {
  tokens: Token[] | undefined;
  caret: boolean;
  headingLevel?: number;
}

function proseRole(level: number | undefined): 'body' | 'title' | 'heading' {
  if (level === undefined) return 'body';

  return level === 1 ? 'title' : 'heading';
}

function useProseProps(headingLevel?: number): TextProps {
  const role = proseRole(headingLevel);

  return {
    ref: useClampLeaf(useLineHeight(role)),
    role,
    tone: useContext(MarkdownTone),
    accessibilityRole: headingLevel ? ('heading' as const) : undefined,
    'aria-level': headingLevel,
    className: 'font-sans min-w-0 max-w-full',
  };
}

export function Prose({
  tokens,
  caret,
  headingLevel,
}: ProseProps): React.JSX.Element {
  return (
    <Text {...useProseProps(headingLevel)}>
      <InlineTokens tokens={tokens} />
      {caret && <Caret />}
    </Text>
  );
}
