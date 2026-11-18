import type {
  BlobRef,
  UserMessage as UserMessageRow,
  PromptMessage,
} from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { memo } from 'react';
import { View } from 'react-native';
import { contentImages, type KeyedImage } from '../../view/keyed-image';
import { FeedImage } from '../feed-image';
import { type Reference, ReferenceChips } from './reference-chips';
import { UserMessageBubble } from './user-message-bubble';

export interface UserMessageProps {
  row: UserMessageRow | PromptMessage;
  // Where the App loads a stored image from.
  imageUrl: (blob: BlobRef) => string;
}

interface MessageParts {
  text: string;
  images: KeyedImage[];
  references: Reference[];
}

const messageParts = ({
  id,
  content,
}: UserMessageProps['row']): MessageParts => ({
  text: content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('\n\n'),
  images: contentImages(id, content),
  references: content.filter(
    (block) => block.type === 'resource_link' || block.type === 'resource',
  ),
});

function MessageImages({
  images,
  imageUrl,
}: Pick<MessageParts, 'images'> &
  Pick<UserMessageProps, 'imageUrl'>): React.JSX.Element | null {
  if (images.length === 0) return null;

  return (
    <View className="max-w-full flex-row flex-wrap justify-end gap-1.5">
      {images.map(({ key, image }) => (
        <FeedImage key={key} image={image} imageKey={key} imageUrl={imageUrl} />
      ))}
    </View>
  );
}

// A stored Prompt uses the existing bubble, with its sender when another Session or Plugin sent it.
export const UserMessage = memo(function UserMessage({
  row,
  imageUrl,
}: UserMessageProps) {
  const { text, images, references } = messageParts(row);

  return (
    <View className="items-end gap-1.5">
      <PromptSenderCaption row={row} />
      <ReferenceChips references={references} />
      <MessageImages images={images} imageUrl={imageUrl} />
      {text.length > 0 && <UserMessageBubble text={text} />}
    </View>
  );
});

function PromptSenderCaption({
  row,
}: Pick<UserMessageProps, 'row'>): React.JSX.Element | null {
  return row.sessionUpdate === 'prompt_message' ? (
    <Text role="secondary" tone="muted">
      From {row._meta.argo.sender.title}
    </Text>
  ) : null;
}
