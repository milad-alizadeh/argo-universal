import type { ContentBlock } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { withOccurrenceKeys } from '#lib/occurrence-keys';
import { resourceIcon, resourceName } from '../lib/resource-name';
import { FeedCodeBlock } from './feed-code-block';
import { FeedDisclosure } from './feed-disclosure';
import { FeedImage } from './feed-image';
import { FeedMarkdown, type FeedMarkdownProps } from './feed-markdown';
import { UnsupportedFeedContent } from './feed-notice';

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
// A supplied resource: its name heads the disclosure; open, a code block shows its URI and its text or description.
function ResourceReference({
  name,
  uri,
  description,
  text,
}: {
  name: string;
  uri: string;
  description?: string;
  text?: string;
}): React.JSX.Element {
  return (
    <FeedDisclosure label={name} icon={resourceIcon(uri)}>
      <FeedCodeBlock uri={uri} code={text} description={description} />
    </FeedDisclosure>
  );
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
