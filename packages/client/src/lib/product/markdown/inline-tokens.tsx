import type { Token } from 'marked';
import type * as React from 'react';
import { type ComponentType, createElement, type ReactNode } from 'react';
import { Text as Span } from 'react-native';
import { markdownMarkClassNames } from '#lib/generic/markdown-marks';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { Link } from './markdown-link';
import { isToken } from './markdown-tokens';

interface InlineTokenProps {
  token: Token;
  codeClassName: string;
}

interface InlineTokensProps {
  tokens: Token[] | undefined;
  codeClassName?: string;
}

function CodespanToken({
  token,
  codeClassName,
}: InlineTokenProps): React.JSX.Element | null {
  return isToken(token, 'codespan') ? (
    <Span className={codeClassName}>{token.text}</Span>
  ) : null;
}

function MarkSpan({
  tokens,
  codeClassName,
  className,
}: InlineTokensProps & { className: string }): React.JSX.Element {
  return (
    <Span className={className}>
      <InlineTokens tokens={tokens} codeClassName={codeClassName} />
    </Span>
  );
}

function StrongToken({ token, codeClassName }: InlineTokenProps): ReactNode {
  return isToken(token, 'strong') ? (
    <MarkSpan
      tokens={token.tokens}
      codeClassName={codeClassName}
      className={markdownMarkClassNames.bold}
    />
  ) : null;
}

function EmToken({ token, codeClassName }: InlineTokenProps): ReactNode {
  return isToken(token, 'em') ? (
    <MarkSpan
      tokens={token.tokens}
      codeClassName={codeClassName}
      className={markdownMarkClassNames.italic}
    />
  ) : null;
}

function DelToken({ token, codeClassName }: InlineTokenProps): ReactNode {
  return isToken(token, 'del') ? (
    <MarkSpan
      tokens={token.tokens}
      codeClassName={codeClassName}
      className={markdownMarkClassNames.strikethrough}
    />
  ) : null;
}

function LinkToken({
  token,
  codeClassName,
}: InlineTokenProps): React.JSX.Element | null {
  return isToken(token, 'link') ? (
    <Link href={token.href}>
      <InlineTokens tokens={token.tokens} codeClassName={codeClassName} />
    </Link>
  ) : null;
}

function BrToken(): string {
  return '\n';
}

function InlineTextToken({
  token,
  codeClassName,
}: InlineTokenProps): ReactNode {
  if (!isToken(token, 'text')) return null;
  return token.tokens ? (
    <InlineTokens tokens={token.tokens} codeClassName={codeClassName} />
  ) : (
    token.text
  );
}

function OtherInlineToken({ token }: InlineTokenProps): ReactNode {
  return 'text' in token ? String(token.text) : null;
}

const inlineTokens = new Map<string, ComponentType<InlineTokenProps>>([
  ['codespan', CodespanToken],
  ['strong', StrongToken],
  ['em', EmToken],
  ['del', DelToken],
  ['link', LinkToken],
  ['br', BrToken],
  ['text', InlineTextToken],
]);

function inlineToken(
  token: Token,
  props: { key: string; codeClassName: string },
): React.JSX.Element {
  const Render = inlineTokens.get(token.type) ?? OtherInlineToken;
  return createElement(Render, { ...props, token });
}

// Inline spans are plain native Text so they inherit the size of the block around them.
export function InlineTokens({
  tokens,
  codeClassName = markdownMarkClassNames.code,
}: InlineTokensProps): React.JSX.Element[] | undefined {
  return (
    tokens &&
    withOccurrenceKeys(tokens, (token) => token.raw).map(({ item, key }) =>
      inlineToken(item, { key, codeClassName }),
    )
  );
}
