import type {
  BlobRef,
  ContentBlock,
  ImageContent,
  UserMessage as UserMessageRow,
} from '@repo/contracts';
import { FileIcon, FolderIcon } from 'phosphor-react-native';
import { memo, useState } from 'react';
import {
  Image,
  Pressable,
  Text as Span,
  useWindowDimensions,
  View,
} from 'react-native';
import { Dialog, DialogContent, DialogTitle } from '#primitives/dialog';
import { Text } from '#primitives/text';
import { inlineCodeClassName } from './FeedMarkdown';
import { Icon } from './Icon';

export interface UserMessageProps {
  row: UserMessageRow;
  // Where the App loads a stored image from.
  imageUrl: (blob: BlobRef) => string;
}

const clampedLines = 4;

type Reference = Extract<ContentBlock, { type: 'resource_link' | 'resource' }>;

// Text exactly as typed, with backtick spans drawn as inline code.
function TypedText({ text }: { text: string }) {
  return text.split(/(`[^`\n]+`)/).map((part, index) =>
    part.length > 2 && part.startsWith('`') && part.endsWith('`') ? (
      <Span key={index} className={inlineCodeClassName}>
        {part.slice(1, -1)}
      </Span>
    ) : (
      part
    ),
  );
}

function Bubble({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [fullHeight, setFullHeight] = useState(0);
  const [shownHeight, setShownHeight] = useState(0);
  const clamped = !expanded && fullHeight > shownHeight + 1;
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

function imageLabel(image: ImageContent) {
  if (image._meta?.argo?.source === 'pasted') return 'Pasted';
  const { width, height } = image.blob;
  return width && height ? `${width}×${height}` : undefined;
}

function Thumbnail({
  image,
  imageUrl,
}: {
  image: ImageContent;
  imageUrl: UserMessageProps['imageUrl'];
}) {
  const [open, setOpen] = useState(false);
  const window = useWindowDimensions();
  const label = imageLabel(image);
  const aspectRatio =
    image.blob.width && image.blob.height
      ? image.blob.width / image.blob.height
      : 1;
  const width = Math.min(window.width * 0.9, window.height * 0.8 * aspectRatio);
  const source = { uri: imageUrl(image.blob) };
  return (
    <>
      <Pressable
        role="button"
        aria-label={label ? `Open image, ${label}` : 'Open image'}
        onPress={() => setOpen(true)}
        className="h-[84px] w-[120px] shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
      >
        <Image source={source} resizeMode="cover" className="size-full" />
      </Pressable>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-auto gap-0 overflow-hidden p-0 sm:max-w-none">
          <DialogTitle className="sr-only">{label ?? 'Image'}</DialogTitle>
          <Image
            source={source}
            resizeMode="contain"
            accessibilityLabel={label ?? 'Image'}
            style={{ width, aspectRatio }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function referenceName(reference: Reference) {
  if (reference.type === 'resource_link') return reference.name;
  const path = reference.resource.uri.replace(/\/$/, '');
  return path.slice(path.lastIndexOf('/') + 1);
}

function isFolder(reference: Reference) {
  const uri =
    reference.type === 'resource_link' ? reference.uri : reference.resource.uri;
  const mimeType =
    reference.type === 'resource_link'
      ? reference.mimeType
      : reference.resource.mimeType;
  return mimeType === 'inode/directory' || uri.endsWith('/');
}

function ReferenceChip({ reference }: { reference: Reference }) {
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
          {references.map((reference, index) => (
            <ReferenceChip
              key={`${index}-${referenceName(reference)}`}
              reference={reference}
            />
          ))}
        </View>
      )}
      {images.length > 0 && (
        <View className="max-w-full flex-row flex-wrap justify-end gap-1.5">
          {images.map((image) => (
            <Thumbnail
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
