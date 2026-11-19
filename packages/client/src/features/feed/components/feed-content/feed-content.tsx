import type { ContentBlock } from '@repo/contracts';
import { withOccurrenceKeys } from '@repo/kit/occurrence-keys';
import { ResourceCode as FeedCodeBlock } from '@repo/kit/primitives/content/code';
import { resourceIcon, resourceName } from '@repo/kit/primitives/content/code';
import { Markdown } from '@repo/kit/primitives/content/markdown';
import type * as React from 'react';
import { View } from 'react-native';
import { imageKeyAt } from '../../view/keyed-image';
import { FeedDisclosure } from '../feed-disclosure';
import { FeedImage } from '../feed-image';
import { UnsupportedFeedContent } from '../feed-notice/feed-notice';

type ResourceLinkBlock = Extract<ContentBlock, { type: 'resource_link' }>;

type NonTextBlock = Exclude<ContentBlock, { type: 'text' | 'resource_link' }>;

interface ResourceReferenceProps {
  name: string;
  uri: string;
  description?: string;
  text?: string;
}

// The resource's own uri names the file, so its extension colours the text the same way a fence's tag does.
function ResourceCode(props: {
  uri: string;
  text?: string;
  description?: string;
}): React.JSX.Element {
  return (
    <FeedCodeBlock
      uri={props.uri}
      code={props.text}
      description={props.description}
      language={props.uri}
    />
  );
}

// A supplied resource: its name heads the disclosure; open, a code block shows its URI and its text or description.
function ResourceReference({
  name,
  uri,
  description,
  text,
}: ResourceReferenceProps): React.JSX.Element {
  return (
    <FeedDisclosure label={name} icon={resourceIcon(uri)}>
      <ResourceCode uri={uri} text={text} description={description} />
    </FeedDisclosure>
  );
}

const resourceLink = (block: ResourceLinkBlock): React.JSX.Element => (
  <ResourceReference
    name={block.title ?? block.name}
    uri={block.uri}
    description={block.description}
  />
);

function FeedNonTextContent({
  block,
  imageKey,
}: {
  block: NonTextBlock;
  imageKey?: string;
}): React.JSX.Element {
  if (block.type === 'resource') {
    const { uri, text } = block.resource;

    return <ResourceReference name={resourceName(uri)} uri={uri} text={text} />;
  }

  if (block.type === 'unsupported')
    return <UnsupportedFeedContent block={block} />;

  return <FeedImage image={block} imageKey={imageKey} />;
}

interface TextDrawing {
  streaming: boolean;
  // Words a Voice call is still saying draw in the muted colour; nothing else about the text changes.
  tone?: 'muted';
}

interface FeedContentBlockProps extends TextDrawing {
  block: ContentBlock;
  // Where the Feed holds the block, when it is an image of a row the Feed lists.
  imageKey?: string;
}

const markdown = (
  text: string,
  { streaming, tone }: TextDrawing,
): React.JSX.Element => (
  <Markdown text={text} streaming={streaming} selectable tone={tone} />
);

function FeedContentBlock({
  block,
  imageKey,
  ...drawing
}: FeedContentBlockProps): React.JSX.Element {
  if (block.type === 'text') return markdown(block.text, drawing);

  return block.type === 'resource_link' ? (
    resourceLink(block)
  ) : (
    <FeedNonTextContent block={block} imageKey={imageKey} />
  );
}

const blockType = (block: ContentBlock): ContentBlock['type'] => block.type;

interface KeyedBlocks {
  content: readonly ContentBlock[];
  streaming: boolean;
  rowId?: string;
}

// Each block with its key; only the last block streams, and a listed row's blocks carry their place in it.
const keyedBlocks = ({
  content,
  streaming,
  rowId,
}: KeyedBlocks): ({ key: string } & Omit<FeedContentBlockProps, 'tone'>)[] =>
  withOccurrenceKeys(content, blockType).map(({ item, key }, index) => ({
    key,
    block: item,
    streaming: streaming && index === content.length - 1,
    imageKey: rowId === undefined ? undefined : imageKeyAt(rowId, index),
  }));

interface FeedContentProps {
  content: readonly ContentBlock[];
  streaming?: boolean;
  tone?: 'muted';
  // The row the blocks belong to, so its images open among the Feed's other images.
  rowId?: string;
}

export function FeedContent({
  content,
  streaming = false,
  tone,
  rowId,
}: FeedContentProps): React.JSX.Element {
  return (
    <View className="gap-2.5">
      {keyedBlocks({ content, streaming, rowId }).map(({ key, ...block }) => (
        <FeedContentBlock key={key} {...block} tone={tone} />
      ))}
    </View>
  );
}
