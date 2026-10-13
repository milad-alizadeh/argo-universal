import type {
  BlobRef,
  ContentBlock,
  ImageContent,
  UserMessage as UserMessageRow,
} from '@repo/contracts';
import type * as React from 'react';
import { memo } from 'react';
import { View } from 'react-native';
import { FeedImage } from '../feed-image';
import { type Reference, ReferenceChips } from './reference-chips';
import { UserMessageBubble } from './user-message-bubble';

export interface UserMessageProps {
  row: UserMessageRow;
  // Where the App loads a stored image from.
  imageUrl: (blob: BlobRef) => string;
}

interface MessageParts {
  text: string;
  images: ImageContent[];
  references: Reference[];
}

const messageParts = (content: ContentBlock[]): MessageParts => ({
  text: content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('\n\n'),
  images: content.filter((block) => block.type === 'image'),
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
      {images.map((image) => (
        <FeedImage key={image.blob.blobId} image={image} imageUrl={imageUrl} />
      ))}
    </View>
  );
}

// A prompt as the person sent it: images and file chips above a right-aligned bubble.
export const UserMessage = memo(function UserMessage({
  row,
  imageUrl,
}: UserMessageProps) {
  const { text, images, references } = messageParts(row.content);
  return (
    <View className="items-end gap-1.5">
      <ReferenceChips references={references} />
      <MessageImages images={images} imageUrl={imageUrl} />
      {text.length > 0 && <UserMessageBubble text={text} />}
    </View>
  );
});
