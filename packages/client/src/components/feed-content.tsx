import type { ContentBlock, EmbeddedResource } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { withOccurrenceKeys } from '#lib/occurrence-keys';
import { FeedCodeBlock } from './feed-code-block';
import { FeedMarkdown } from './feed-markdown';
import {
  FeedReference,
  ResourceReference,
  UnsupportedFeedContent,
} from './feed-reference';

const EmbeddedFeedResource = ({
  block,
}: {
  block: EmbeddedResource;
}): React.JSX.Element => (
  <View className="gap-2">
    <FeedReference title="Resource" uri={block.resource.uri} />
    {block.resource.text !== undefined && (
      <FeedCodeBlock
        code={block.resource.text}
        language={block.resource.mimeType}
      />
    )}
  </View>
);
function FeedContentBlock({
  block,
  streaming,
}: {
  block: ContentBlock;
  streaming: boolean;
}): React.JSX.Element {
  if (block.type === 'text')
    return <FeedMarkdown text={block.text} streaming={streaming} />;
  if (block.type === 'resource_link')
    return <ResourceReference block={block} />;
  return <FeedNonTextContent block={block} />;
}
function FeedNonTextContent({
  block,
}: {
  block: Exclude<ContentBlock, { type: 'text' | 'resource_link' }>;
}): React.JSX.Element {
  if (block.type === 'resource') return <EmbeddedFeedResource block={block} />;
  if (block.type === 'unsupported')
    return <UnsupportedFeedContent block={block} />;
  return (
    <FeedReference title="Stored image" uri={`Blob ${block.blob.blobId}`} />
  );
}
export function FeedContent({
  content,
  streaming = false,
}: {
  content: readonly ContentBlock[];
  streaming?: boolean;
}): React.JSX.Element {
  return (
    <View className="gap-2.5">
      {withOccurrenceKeys(content, (block) => block.type).map(
        ({ item: block, key }, index) => (
          <FeedContentBlock
            key={key}
            block={block}
            streaming={streaming && index === content.length - 1}
          />
        ),
      )}
    </View>
  );
}
