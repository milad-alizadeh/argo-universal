import { useSyncLayout } from '@legendapp/list/react-native';
import type {
  BlobRef,
  ContentBlock,
  UserMessage as UserMessageRow,
} from '@repo/contracts';
import type * as React from 'react';
import { memo, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { Text } from '#lib/generic/primitives/display/text/text';
import { FeedMarkdown } from '#lib/product/markdown/feed-markdown';
import { Icon } from '../../../../lib/generic/symbols/icon';
import { ClampLeaves } from '../../../../lib/product/markdown/clamp-leaves';
import { resourceName } from '../../../../lib/product/markdown/resource-name';
import { useWholeLineClamp } from '../../../../lib/product/markdown/use-whole-line-clamp';
import { FeedImage } from '../feed-image';

export interface UserMessageProps {
  row: UserMessageRow;
  // Where the App loads a stored image from.
  imageUrl: (blob: BlobRef) => string;
}

const clampedLines = 4;

type Reference = Extract<ContentBlock, { type: 'resource_link' | 'resource' }>;

function Bubble({ text }: { text: string }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const { content, onContentLayout, registerLeaf, clipHeight } =
    useWholeLineClamp(clampedLines);
  const clamped = !expanded && clipHeight !== undefined;
  // "Show more" lands a layout after the bubble, which Legend List on the web misses until it next measures every row, so the Feed tells it.
  const syncLayout = useSyncLayout();
  const syncedClamped = useRef<boolean | undefined>(undefined);
  useLayoutEffect(() => {
    if (syncedClamped.current === clamped) return;
    syncedClamped.current = clamped;
    syncLayout();
  }, [clamped, syncLayout]);
  return (
    <View className="max-w-[70%] gap-0.5 rounded-2xl bg-muted px-3.5 py-2.5 wide:px-3 wide:py-2">
      <View
        className="overflow-hidden"
        style={clamped ? { maxHeight: clipHeight } : undefined}
      >
        <View ref={content} onLayout={onContentLayout}>
          <ClampLeaves.Provider value={registerLeaf}>
            <FeedMarkdown text={text} />
          </ClampLeaves.Provider>
        </View>
      </View>
      {clamped && (
        <Pressable role="button" onPress={() => setExpanded(true)}>
          <Text role="body" className="font-sans text-muted-foreground">
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
        name={isFolder(reference) ? 'folder' : 'file'}
        role="body"
        className="text-muted-foreground"
      />
      <Text role="body" className="font-sans">
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
