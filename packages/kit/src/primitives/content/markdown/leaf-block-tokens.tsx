import type { Tokens } from 'marked';
import type * as React from 'react';
import { View } from 'react-native';
import { Code } from '#primitives/content/code';
import {
  Diagram,
  isDiagramFence,
  isOpenFence,
} from '#primitives/content/diagram';
import { Caret } from './caret';
import { ClampedBlock } from './clamped-block';
import { type BlockTokenProps, literal } from './markdown-tokens';
import { Prose } from './prose';

export function HeadingToken({
  token,
  caret,
}: BlockTokenProps<Tokens.Heading>): React.JSX.Element | null {
  return (
    <Prose tokens={token.tokens} caret={caret} headingLevel={token.depth} />
  );
}

export function ParagraphToken({
  token,
  caret,
}: BlockTokenProps<Tokens.Paragraph>): React.JSX.Element | null {
  return <Prose tokens={token.tokens} caret={caret} />;
}

export function TextToken({
  token,
  caret,
}: BlockTokenProps<Tokens.Text>): React.JSX.Element | null {
  return <Prose tokens={token.tokens ?? [token]} caret={caret} />;
}

export function HtmlToken({
  token,
  caret,
}: BlockTokenProps<Tokens.HTML | Tokens.Tag>): React.JSX.Element {
  return <Prose tokens={[literal(token)]} caret={caret} />;
}

export function DefToken({
  token,
  caret,
}: BlockTokenProps<Tokens.Def>): React.JSX.Element {
  return <Prose tokens={[literal(token)]} caret={caret} />;
}

export function HrToken({
  caret,
}: BlockTokenProps<Tokens.Hr>): React.JSX.Element {
  return (
    <ClampedBlock caret={caret}>
      <View role="separator" />
    </ClampedBlock>
  );
}

export function CodeToken({
  token,
  caret,
}: BlockTokenProps<Tokens.Code>): React.JSX.Element {
  return (
    <ClampedBlock caret={caret}>
      <FencedBlock token={token} streaming={caret} />
    </ClampedBlock>
  );
}

type FenceProps = { token: Tokens.Code; streaming: boolean };

// Only the last block streams, so a fence above it has closed even without its marker.
function DiagramFence({ token, streaming }: FenceProps): React.JSX.Element {
  return (
    <Diagram
      source={token.text}
      pending={streaming && isOpenFence(token.raw)}
    />
  );
}

function FencedBlock({ token, streaming }: FenceProps): React.JSX.Element {
  if (isDiagramFence(token.lang))
    return <DiagramFence token={token} streaming={streaming} />;

  return <Code code={token.text} language={token.lang || undefined} />;
}

// A token this Feed does not draw still carries the streaming caret.
export function OtherToken({
  caret,
}: BlockTokenProps): React.JSX.Element | null {
  return caret ? <Caret /> : null;
}
