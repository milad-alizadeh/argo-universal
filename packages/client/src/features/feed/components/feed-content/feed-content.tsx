import type { ContentBlock } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { FeedCodeBlock } from '#lib/product/markdown/feed-code-block/feed-code-block';
import {
  FeedMarkdown,
  type FeedMarkdownProps,
} from '#lib/product/markdown/feed-markdown';
import {
  resourceIcon,
  resourceName,
} from '../../../../lib/product/markdown/resource-name';
import { FeedDisclosure } from '../feed-disclosure';
import { FeedImage } from '../feed-image';
import { UnsupportedFeedContent } from '../feed-notice/feed-notice';

type TextVariant = FeedMarkdownProps['variant'];

type ResourceLinkBlock = Extract<ContentBlock, { type: 'resource_link' }>;

type NonTextBlock = Exclude<ContentBlock, { type: 'text' | 'resource_link' }>;

interface ResourceReferenceProps {
  name: string;
  uri: string;
  description?: string;
  text?: string;
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
      <FeedCodeBlock uri={uri} code={text} description={description} />
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
}: {
  block: NonTextBlock;
}): React.JSX.Element {
  if (block.type === 'resource') {
    const { uri, text } = block.resource;

    return <ResourceReference name={resourceName(uri)} uri={uri} text={text} />;
  }

  if (block.type === 'unsupported')
    return <UnsupportedFeedContent block={block} />;

  return <FeedImage image={block} />;
}

interface TextDrawing {
  streaming: boolean;
  textVariant: TextVariant;
}

interface FeedContentBlockProps extends TextDrawing {
  block: ContentBlock;
}

const markdown = (
  text: string,
  { streaming, textVariant }: TextDrawing,
): React.JSX.Element => (
  <FeedMarkdown text={text} streaming={streaming} variant={textVariant} />
);

function FeedContentBlock({
  block,
  ...drawing
}: FeedContentBlockProps): React.JSX.Element {
  if (block.type === 'text') return markdown(block.text, drawing);

  return block.type === 'resource_link' ? (
    resourceLink(block)
  ) : (
    <FeedNonTextContent block={block} />
  );
}

const blockType = (block: ContentBlock): ContentBlock['type'] => block.type;

// Each block with its key; only the last block streams.
const keyedBlocks = (
  content: readonly ContentBlock[],
  streaming: boolean,
): { key: string; block: ContentBlock; streaming: boolean }[] =>
  withOccurrenceKeys(content, blockType).map(({ item, key }, index) => ({
    key,
    block: item,
    streaming: streaming && index === content.length - 1,
  }));

interface FeedContentProps {
  content: readonly ContentBlock[];
  streaming?: boolean;
  textVariant?: TextVariant;
}

export function FeedContent({
  content,
  streaming = false,
  textVariant = 'feed',
}: FeedContentProps): React.JSX.Element {
  return (
    <View className="gap-2.5">
      {keyedBlocks(content, streaming).map(({ key, ...block }) => (
        <FeedContentBlock key={key} {...block} textVariant={textVariant} />
      ))}
    </View>
  );
}
