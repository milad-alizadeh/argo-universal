import type { ContentBlock } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { withOccurrenceKeys } from '#lib/occurrence-keys';
import { FeedImage } from './feed-image';
import { FeedMarkdown, type FeedMarkdownProps } from './feed-markdown';
import { UnsupportedFeedContent } from './feed-notice';
import { ResourceReference, resourceName } from './feed-reference';

function FeedContentBlock({
  block,
  streaming,
  textVariant,
}: {
  block: ContentBlock;
  streaming: boolean;
  textVariant: FeedMarkdownProps['variant'];
}): React.JSX.Element {
  if (block.type === 'text')
    return (
      <FeedMarkdown
        text={block.text}
        streaming={streaming}
        variant={textVariant}
      />
    );
  if (block.type === 'resource_link')
    return (
      <ResourceReference
        name={block.title ?? block.name}
        uri={block.uri}
        description={block.description}
      />
    );
  return <FeedNonTextContent block={block} />;
}
function FeedNonTextContent({
  block,
}: {
  block: Exclude<ContentBlock, { type: 'text' | 'resource_link' }>;
}): React.JSX.Element {
  if (block.type === 'resource')
    return (
      <ResourceReference
        name={resourceName(block.resource.uri)}
        uri={block.resource.uri}
        text={block.resource.text}
      />
    );
  if (block.type === 'unsupported')
    return <UnsupportedFeedContent block={block} />;
  return <FeedImage image={block} />;
}
export function FeedContent({
  content,
  streaming = false,
  textVariant = 'feed',
}: {
  content: readonly ContentBlock[];
  streaming?: boolean;
  textVariant?: FeedMarkdownProps['variant'];
}): React.JSX.Element {
  return (
    <View className="gap-2.5">
      {withOccurrenceKeys(content, (block) => block.type).map(
        ({ item: block, key }, index) => (
          <FeedContentBlock
            key={key}
            block={block}
            textVariant={textVariant}
            streaming={streaming && index === content.length - 1}
          />
        ),
      )}
    </View>
  );
}
