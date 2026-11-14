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

/*
 * A description's sections are its H2s, so they read a size above the body as H1 does; H3 and below keep the body's
 * size and are set apart by weight alone.
 */
function proseRole(level: number | undefined): 'body' | 'title' | 'heading' {
  if (level === undefined) return 'body';

  return level <= 2 ? 'title' : 'heading';
}

export function Prose(props: ProseProps): React.JSX.Element {
  return (
    <ClampText
      role={proseRole(props.headingLevel)}
      tone={useContext(MarkdownTone)}
      accessibilityRole={props.headingLevel ? 'heading' : undefined}
      aria-level={props.headingLevel}
      className="min-w-0 max-w-full wrap-anywhere"
    >
      <InlineTokens tokens={props.tokens} />
      {props.caret && <Caret />}
    </ClampText>
  );
}
