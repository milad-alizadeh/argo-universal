import type { ContentBlock, SessionMessage } from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
import { FeedContent } from './feed-content/feed-content';

export function ParentResult({
  content,
}: {
  content: readonly ContentBlock[];
}): React.JSX.Element {
  return (
    <ReplyContent label="Reported to the parent Session" content={content} />
  );
}

export function ChildReply({
  row,
}: {
  row: SessionMessage;
}): React.JSX.Element {
  return <ReplyContent label="Sent by this Agent" content={row.content} />;
}

function ReplyContent({
  label,
  content,
}: {
  label: string;
  content: readonly ContentBlock[];
}): React.JSX.Element {
  return (
    <View className="gap-2">
      <Text role="secondary">{label}</Text>
      <FeedContent content={content} />
    </View>
  );
}
