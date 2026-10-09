import type { ResourceLink, UnsupportedContent } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/text';

export function FeedReference({
  title,
  uri,
  description,
}: {
  title: string;
  uri: string;
  description?: string;
}): React.JSX.Element {
  return (
    <View className="gap-1 rounded-lg border border-border px-3 py-2">
      <Text className="text-sm font-medium text-foreground">{title}</Text>
      <Text
        selectable
        className="font-mono text-xs leading-5 text-muted-foreground"
      >
        {uri}
      </Text>
      {!!description && (
        <Text className="text-sm text-muted-foreground">{description}</Text>
      )}
    </View>
  );
}
export function ResourceReference({
  block,
}: {
  block: ResourceLink;
}): React.JSX.Element {
  return (
    <FeedReference
      title={block.title ?? block.name}
      uri={block.uri}
      description={block.description}
    />
  );
}
export function UnsupportedFeedContent({
  block,
}: {
  block: UnsupportedContent;
}): React.JSX.Element {
  return (
    <View className="gap-1 rounded-lg border border-border px-3 py-2">
      <Text className="text-sm font-medium text-foreground">
        Unsupported {block.contentKind} content
      </Text>
      <Text className="text-sm text-muted-foreground">{block.reason}</Text>
      {!!block.reference && (
        <Text selectable className="font-mono text-xs text-muted-foreground">
          {block.reference}
        </Text>
      )}
    </View>
  );
}
