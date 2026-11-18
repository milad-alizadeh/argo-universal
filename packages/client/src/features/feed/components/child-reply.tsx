import type { ContentBlock, SessionMessage } from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
import { FeedContent } from './feed-content/feed-content';

interface Reply {
  // The item the blocks belong to, so its images open among the Feed's other images.
  id: string;
  content: readonly ContentBlock[];
}

export function ParentResult(reply: Reply): React.JSX.Element {
  return <ReplyContent label="Reported to the parent Session" {...reply} />;
}

export function ChildReply({
  row,
}: {
  row: SessionMessage;
}): React.JSX.Element {
  return (
    <ReplyContent
      label="Sent by this Agent"
      id={row.id}
      content={row.content}
    />
  );
}

function ReplyContent({
  label,
  id,
  content,
}: Reply & { label: string }): React.JSX.Element {
  return (
    <View className="gap-2">
      <Text role="secondary">{label}</Text>
      <FeedContent content={content} rowId={id} />
    </View>
  );
}
