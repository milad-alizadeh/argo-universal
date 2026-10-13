import type { Token } from 'marked';
import type * as React from 'react';
import { type ComponentProps, useContext } from 'react';
import { markdownBlockClassNames } from '#lib/generic/markdown-marks';
import { Text } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';
import { Caret } from './caret';
import { useClampLeaf, useLineHeight } from './clamp-leaves';
import { InlineTokens } from './inline-tokens';
import { MarkdownVariant, type MarkdownVariantName } from './markdown-variant';

interface ProseProps {
  tokens: Token[] | undefined;
  caret: boolean;
  headingLevel?: number;
}

type ProseTextProps = Pick<
  ComponentProps<typeof Text>,
  'semanticRole' | 'aria-level' | 'className'
>;

function proseClassName(
  heading: boolean,
  variant: MarkdownVariantName,
): string {
  return cn(
    'font-sans',
    heading && markdownBlockClassNames.heading,
    variant === 'summary' && 'text-muted-foreground',
  );
}

// A heading is prose that also announces its level.
function useProseTextProps(headingLevel?: number): ProseTextProps {
  const heading = headingLevel !== undefined;
  return {
    semanticRole: heading ? 'heading' : undefined,
    'aria-level': headingLevel,
    className: proseClassName(heading, useContext(MarkdownVariant)),
  };
}

export function Prose({
  tokens,
  caret,
  headingLevel,
}: ProseProps): React.JSX.Element {
  const leaf = useClampLeaf(useLineHeight('body'));
  return (
    <Text ref={leaf} {...useProseTextProps(headingLevel)}>
      <InlineTokens tokens={tokens} />
      {caret && <Caret />}
    </Text>
  );
}
