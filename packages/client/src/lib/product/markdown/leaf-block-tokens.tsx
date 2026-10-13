import type * as React from 'react';
import { View } from 'react-native';
import { Caret } from './caret';
import { ClampedBlock } from './clamped-block';
import { FeedCodeBlock } from './feed-code-block/feed-code-block';
import { type BlockTokenProps, isToken, literal } from './markdown-tokens';
import { Prose } from './prose';

export function HeadingToken({
  token,
  caret,
}: BlockTokenProps): React.JSX.Element | null {
  return isToken(token, 'heading') ? (
    <Prose tokens={token.tokens} caret={caret} headingLevel={token.depth} />
  ) : null;
}

export function ParagraphToken({
  token,
  caret,
}: BlockTokenProps): React.JSX.Element | null {
  return isToken(token, 'paragraph') ? (
    <Prose tokens={token.tokens} caret={caret} />
  ) : null;
}

export function TextToken({
  token,
  caret,
}: BlockTokenProps): React.JSX.Element | null {
  return isToken(token, 'text') ? (
    <Prose tokens={token.tokens ?? [token]} caret={caret} />
  ) : null;
}

export function HtmlToken({
  token,
  caret,
}: BlockTokenProps): React.JSX.Element {
  return <Prose tokens={[literal(token)]} caret={caret} />;
}

export function DefToken({ token, caret }: BlockTokenProps): React.JSX.Element {
  return <Prose tokens={[literal(token)]} caret={caret} />;
}

export function HrToken({ caret }: BlockTokenProps): React.JSX.Element {
  return (
    <ClampedBlock caret={caret}>
      <View role="separator" className="border-t border-border" />
    </ClampedBlock>
  );
}

export function CodeToken({
  token,
  caret,
}: BlockTokenProps): React.JSX.Element {
  return (
    <ClampedBlock caret={caret}>
      {isToken(token, 'code') && (
        <FeedCodeBlock code={token.text} language={token.lang || undefined} />
      )}
    </ClampedBlock>
  );
}

// A token this Feed does not draw still carries the streaming caret.
export function OtherToken({
  caret,
}: BlockTokenProps): React.JSX.Element | null {
  return caret ? <Caret /> : null;
}
