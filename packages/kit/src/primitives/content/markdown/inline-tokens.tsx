import type { Token, Tokens } from 'marked';
import type * as React from 'react';
import { type ComponentType, createElement, type ReactNode } from 'react';
import { Text as Span } from 'react-native';
import { markdownMarkClassNames } from '#kit/markdown-marks';
import { withOccurrenceKeys } from '#kit/occurrence-keys';
import { Link } from '#primitives/content/link';
import { ArrivingRun } from './arriving-run';
import { type Piece, piecesOf } from './arriving-text';
import { drawnText } from './drawn-text';
import { byType } from './markdown-tokens';

// Where a token's text starts in its block's drawn text, and where each run of newly arrived text begins there.
export interface Arriving {
  marks: readonly number[];
  start: number;
}

interface Drawing {
  codeClassName: string;
  // Set while the block is being written, or its last runs fade.
  arriving?: Arriving;
}

type InlineTokenProps<T extends Token = Token> = Drawing & { token: T };

type InlineTokensProps = Partial<Drawing> & { tokens: Token[] | undefined };

type MarkToken = Tokens.Strong | Tokens.Em | Tokens.Del;

const markClassNames: Record<MarkToken['type'], string> = {
  strong: markdownMarkClassNames.bold,
  em: markdownMarkClassNames.italic,
  del: markdownMarkClassNames.strikethrough,
};

// A piece is held by where it starts, so text on screen keeps its element and never fades twice.
function pieceNode({ text, start, arriving }: Piece): ReactNode {
  return arriving ? <ArrivingRun key={start}>{text}</ArrivingRun> : text;
}

// A token's own text: whole at rest, and cut into the runs it arrived in while its block is written.
function ownText(text: string, arriving: Arriving | undefined): ReactNode {
  if (!arriving) return text;

  return piecesOf({ text, start: arriving.start }, arriving.marks).map(
    pieceNode,
  );
}

function CodespanToken({
  token,
  codeClassName,
  arriving,
}: InlineTokenProps<Tokens.Codespan>): React.JSX.Element {
  return <Span className={codeClassName}>{ownText(token.text, arriving)}</Span>;
}

function MarkToken({
  token,
  ...drawing
}: InlineTokenProps<MarkToken>): React.JSX.Element {
  return (
    <Span className={markClassNames[token.type]}>
      <InlineTokens tokens={token.tokens} {...drawing} />
    </Span>
  );
}

function LinkToken({
  token,
  ...drawing
}: InlineTokenProps<Tokens.Link>): React.JSX.Element {
  return (
    // The href is the Agent's text, never an App route: a path such as /tmp/a.txt is not a page.
    <Link href={token.href} label={token.text}>
      <InlineTokens tokens={token.tokens} {...drawing} />
    </Link>
  );
}

function BrToken(): string {
  return '\n';
}

function InlineTextToken({
  token,
  ...drawing
}: InlineTokenProps<Tokens.Text>): ReactNode {
  return token.tokens ? (
    <InlineTokens tokens={token.tokens} {...drawing} />
  ) : (
    ownText(token.text, drawing.arriving)
  );
}

function OtherInlineToken({ token, arriving }: InlineTokenProps): ReactNode {
  return 'text' in token ? ownText(String(token.text), arriving) : null;
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
  props: Drawing & { key: string },
): React.JSX.Element {
  const Render = inlineTokens.get(token.type) ?? OtherInlineToken;

  return createElement(Render, { ...props, token });
}

interface Placed {
  item: Token;
  key: string;
  start: number;
}

/*
 * A block being written holds each token by its kind and how many of that kind come before it, as
 * blocks are held: a key made of the token's text would change with every chunk, and draw the
 * token's runs again from the start of their fade.
 */
function placedTokens(tokens: Token[], from: number): Placed[] {
  let start = from;

  return withOccurrenceKeys(tokens, (token) => token.type).map((keyed) => {
    const placed = { ...keyed, start };

    start += drawnText([keyed.item]).length;

    return placed;
  });
}

function arrivingTokens(
  tokens: Token[],
  { codeClassName, arriving }: Required<Drawing>,
): React.JSX.Element[] {
  return placedTokens(tokens, arriving.start).map(({ item, key, start }) =>
    inlineToken(item, {
      key,
      codeClassName,
      arriving: { marks: arriving.marks, start },
    }),
  );
}

function restingTokens(
  tokens: Token[],
  codeClassName: string,
): React.JSX.Element[] {
  return withOccurrenceKeys(tokens, (token) => token.raw).map(({ item, key }) =>
    inlineToken(item, { key, codeClassName }),
  );
}

function drawnTokens(
  tokens: Token[],
  { codeClassName, arriving }: Drawing,
): React.JSX.Element[] {
  return arriving
    ? arrivingTokens(tokens, { codeClassName, arriving })
    : restingTokens(tokens, codeClassName);
}

// Inline spans are plain native Text so they inherit the size of the block around them.
export function InlineTokens({
  tokens,
  codeClassName = markdownMarkClassNames.code,
  arriving,
}: InlineTokensProps): React.JSX.Element[] | undefined {
  if (!tokens) return undefined;

  return drawnTokens(tokens, { codeClassName, arriving });
}
