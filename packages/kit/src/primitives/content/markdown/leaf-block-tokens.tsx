import type { Tokens } from 'marked';
import type * as React from 'react';
import { View } from 'react-native';
import { Code } from '#primitives/content/code';
import {
  Diagram,
  isDiagramFence,
  isOpenFence,
} from '#primitives/content/diagram';
import { ClampedBlock } from './clamped-block';
import { type BlockTokenProps, literal } from './markdown-tokens';
import { Prose } from './prose';

export function HeadingToken({
  token,
  streaming,
}: BlockTokenProps<Tokens.Heading>): React.JSX.Element | null {
  return (
    <Prose
      streaming={streaming}
      tokens={token.tokens}
      headingLevel={token.depth}
    />
  );
}

export function ParagraphToken({
  token,
  streaming,
}: BlockTokenProps<Tokens.Paragraph>): React.JSX.Element | null {
  return <Prose streaming={streaming} tokens={token.tokens} />;
}

export function TextToken({
  token,
  streaming,
}: BlockTokenProps<Tokens.Text>): React.JSX.Element | null {
  return <Prose streaming={streaming} tokens={token.tokens ?? [token]} />;
}

export function HtmlToken({
  token,
  streaming,
}: BlockTokenProps<Tokens.HTML | Tokens.Tag>): React.JSX.Element {
  return <Prose streaming={streaming} tokens={[literal(token)]} />;
}

export function DefToken({
  token,
  streaming,
}: BlockTokenProps<Tokens.Def>): React.JSX.Element {
  return <Prose streaming={streaming} tokens={[literal(token)]} />;
}

export function HrToken(): React.JSX.Element {
  return (
    <ClampedBlock>
      <View role="separator" />
    </ClampedBlock>
  );
}

export function CodeToken({
  token,
  streaming,
}: BlockTokenProps<Tokens.Code>): React.JSX.Element {
  return (
    <ClampedBlock>
      <FencedBlock token={token} streaming={streaming} />
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

// Unsupported blocks draw nothing.
export function OtherToken(): React.JSX.Element | null {
  return null;
}
