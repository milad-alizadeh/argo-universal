import type { Token, Tokens } from 'marked';
import type * as React from 'react';
import { type ComponentType, createElement, type ReactNode } from 'react';
import { Text as Span } from 'react-native';
import { markdownMarkClassNames } from '#kit/markdown-marks';
import { withOccurrenceKeys } from '#kit/occurrence-keys';
import { Link } from '#primitives/content/link';
import { byType } from './markdown-tokens';

interface InlineTokenProps<T extends Token = Token> {
  token: T;
  codeClassName: string;
}

interface InlineTokensProps {
  tokens: Token[] | undefined;
  codeClassName?: string;
}

type MarkToken = Tokens.Strong | Tokens.Em | Tokens.Del;

const markClassNames: Record<MarkToken['type'], string> = {
  strong: markdownMarkClassNames.bold,
  em: markdownMarkClassNames.italic,
  del: markdownMarkClassNames.strikethrough,
};

function CodespanToken({
  token,
  codeClassName,
}: InlineTokenProps<Tokens.Codespan>): React.JSX.Element {
  return <Span className={codeClassName}>{token.text}</Span>;
}

function MarkToken({
  token,
  codeClassName,
}: InlineTokenProps<MarkToken>): React.JSX.Element {
  return (
    <Span className={markClassNames[token.type]}>
      <InlineTokens tokens={token.tokens} codeClassName={codeClassName} />
    </Span>
  );
}

function LinkToken({
  token,
  codeClassName,
}: InlineTokenProps<Tokens.Link>): React.JSX.Element {
  return (
    // The href is the Agent's text, never an App route: a path such as /tmp/a.txt is not a page.
    <Link href={token.href} label={token.text}>
      <InlineTokens tokens={token.tokens} codeClassName={codeClassName} />
    </Link>
  );
}

function BrToken(): string {
  return '\n';
}

function InlineTextToken({
  token,
  codeClassName,
}: InlineTokenProps<Tokens.Text>): ReactNode {
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
  byType('codespan', CodespanToken),
  byType('strong', MarkToken),
  byType('em', MarkToken),
  byType('del', MarkToken),
  byType('link', LinkToken),
  byType('br', BrToken),
  byType('text', InlineTextToken),
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
