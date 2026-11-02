import type { Token } from 'marked';
import type * as React from 'react';
import { useContext } from 'react';
import { Caret } from './caret';
import { ClampText } from './clamp-text';
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

export function Prose(props: ProseProps): React.JSX.Element {
  const { headingLevel } = props;

  return (
    <ClampText
      role={proseRole(headingLevel)}
      tone={useContext(MarkdownTone)}
      accessibilityRole={headingLevel ? 'heading' : undefined}
      aria-level={headingLevel}
      className="min-w-0 max-w-full"
    >
      <InlineTokens tokens={props.tokens} />
      {props.caret && <Caret />}
    </ClampText>
  );
}
