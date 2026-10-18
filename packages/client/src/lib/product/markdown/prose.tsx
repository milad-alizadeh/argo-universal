import type { Token } from 'marked';
import type * as React from 'react';
import { type ComponentProps, useContext } from 'react';
import { markdownBlockClassNames } from '#lib/generic/markdown-marks';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/content/text';
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
  'accessibilityRole' | 'aria-level' | 'className'
>;

const proseVariantClassNames: Record<MarkdownVariantName, string> = {
  feed: '',
  plan: 'min-w-0 max-w-full ios:text-row ios:leading-row',
  summary: 'text-muted-foreground',
};

function proseClassName(
  heading: boolean,
  variant: MarkdownVariantName,
): string {
  return cn(
    'font-sans',
    proseVariantClassNames[variant],
    heading && markdownBlockClassNames.heading,
  );
}

// A heading is prose that also announces its level.
function useProseTextProps(headingLevel?: number): ProseTextProps {
  const heading = headingLevel !== undefined;

  return {
    accessibilityRole: heading ? 'heading' : undefined,
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
