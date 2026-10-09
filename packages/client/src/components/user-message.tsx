import { useSyncLayout } from '@legendapp/list/react-native';
import type {
  BlobRef,
  ContentBlock,
  UserMessage as UserMessageRow,
} from '@repo/contracts';
import { FileIcon, FolderIcon } from 'phosphor-react-native';
import type * as React from 'react';
import { memo, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, Text as Span, View } from 'react-native';
import { withOccurrenceKeys } from '#lib/occurrence-keys';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';
import { FeedImage } from './feed-image';
import { inlineCodeClassName } from './feed-markdown';
import { resourceName } from './feed-reference';

export interface UserMessageProps {
  row: UserMessageRow;
  // Where the App loads a stored image from.
  imageUrl: (blob: BlobRef) => string;
}

const clampedLines = 4;

type Reference = Extract<ContentBlock, { type: 'resource_link' | 'resource' }>;

// Text exactly as typed, with backtick spans drawn as inline code.
function TypedText({ text }: { text: string }): (string | React.JSX.Element)[] {
  return withOccurrenceKeys(text.split(/(`[^`\n]+`)/), (part) => part).map(
    ({ item: part, key }) =>
      part.length > 2 && part.startsWith('`') && part.endsWith('`') ? (
        <Span key={key} className={inlineCodeClassName}>
          {part.slice(1, -1)}
        </Span>
      ) : (
        part
      ),
  );
}

function Bubble({ text }: { text: string }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [fullHeight, setFullHeight] = useState(0);
  const [shownHeight, setShownHeight] = useState(0);
  const clamped = !expanded && fullHeight > shownHeight + 1;
  // "Show more" lands a layout after the bubble, which Legend List on the web misses until it next measures every row, so the Feed tells it.
  const syncLayout = useSyncLayout();
  const syncedClamped = useRef<boolean | undefined>(undefined);
  useLayoutEffect(() => {
    if (syncedClamped.current === clamped) return;
    syncedClamped.current = clamped;
    syncLayout();
  }, [clamped, syncLayout]);
  return (
    <View className="max-w-[70%] gap-0.5 rounded-xl bg-muted px-4 py-2.5">
      <View>
        <Text
          numberOfLines={expanded ? undefined : clampedLines}
          onLayout={(event) => setShownHeight(event.nativeEvent.layout.height)}
          className="font-sans text-sm leading-5 text-foreground"
        >
          <TypedText text={text} />
        </Text>
        {!expanded && (
          <Text
            aria-hidden
            onLayout={(event) => setFullHeight(event.nativeEvent.layout.height)}
            className="pointer-events-none absolute top-0 right-0 left-0 font-sans text-sm leading-5 opacity-0"
          >
            <TypedText text={text} />
          </Text>
        )}
      </View>
      {clamped && (
        <Pressable role="button" onPress={() => setExpanded(true)}>
          <Text className="font-sans text-sm leading-5 text-muted-foreground">
            Show more
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function referenceName(reference: Reference): string {
  if (reference.type === 'resource_link') return reference.name;
  return resourceName(reference.resource.uri);
}

function isFolder(reference: Reference): boolean {
  const uri =
    reference.type === 'resource_link' ? reference.uri : reference.resource.uri;
  const mimeType =
    reference.type === 'resource_link'
      ? reference.mimeType
      : reference.resource.mimeType;
  return mimeType === 'inode/directory' || uri.endsWith('/');
}

function ReferenceChip({
  reference,
}: {
  reference: Reference;
}): React.JSX.Element {
  return (
    <View className="h-[26px] flex-row items-center gap-1.5 rounded-md border border-border bg-card px-2">
      <Icon
        as={isFolder(reference) ? FolderIcon : FileIcon}
        className="text-muted-foreground"
      />
      <Text className="font-sans text-sm leading-5 text-foreground">
        {referenceName(reference)}
      </Text>
    </View>
  );
}

// A prompt as the person sent it: images and file chips above a right-aligned bubble.
export const UserMessage = memo(function UserMessage({
  row,
  imageUrl,
}: UserMessageProps) {
  const text = row.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('\n\n');
  const images = row.content.filter((block) => block.type === 'image');
  const references = row.content.filter(
    (block) => block.type === 'resource_link' || block.type === 'resource',
  );
  return (
    <View className="items-end gap-1.5">
      {references.length > 0 && (
        <View className="max-w-full flex-row flex-wrap justify-end gap-1.5">
          {withOccurrenceKeys(references, referenceName).map(
            ({ item: reference, key }) => (
              <ReferenceChip key={key} reference={reference} />
            ),
          )}
        </View>
      )}
      {images.length > 0 && (
        <View className="max-w-full flex-row flex-wrap justify-end gap-1.5">
          {images.map((image) => (
            <FeedImage
              key={image.blob.blobId}
              image={image}
              imageUrl={imageUrl}
            />
          ))}
        </View>
      )}
      {text.length > 0 && <Bubble text={text} />}
    </View>
  );
});
