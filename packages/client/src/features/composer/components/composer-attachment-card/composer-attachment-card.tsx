import { isPromptImage, maxBlobUploadBytes } from '@repo/contracts';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { fileTypeIcon } from '@repo/kit/symbols/file-type-icon';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { Image, View } from 'react-native';

export interface ComposerAttachment {
  id: string;
  name: string;
  uri: string;
  bytes: number;
  mimeType: string;
  // The first lines of a text file.
  preview?: string;
}

export interface ComposerAttachmentCardProps {
  attachment: ComposerAttachment;
  disabled: boolean;
  onRemove: () => void;
}

// The tile leaves its Remove button unclipped, so the button's hitSlop can reach past the tile's corner.
const tileClass = 'group/attachment relative w-40 h-30 shrink-0';

const cardClass = 'size-full overflow-hidden rounded-md border bg-card';

const previewClass = 'h-22.5 overflow-hidden';

const linesClass = 'p-2 font-mono text-xs leading-4 text-muted-foreground';

const kindClass = 'items-center justify-center gap-1 bg-muted';

const mutedClass = 'text-muted-foreground';

const removeClass = 'absolute right-1.5 top-1.5 web:wide:opacity-0';

const removeHoverClass = (disabled: boolean): string =>
  disabled
    ? 'web:wide:group-hover/attachment:opacity-50'
    : 'web:wide:group-hover/attachment:opacity-100 web:wide:focus-visible:opacity-100';

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');

  return dot > 0 ? name.slice(dot + 1).toUpperCase() : '';
};

const cardBorder = (attachment: ComposerAttachment): string =>
  attachment.bytes > maxBlobUploadBytes ? 'border-danger' : 'border-border';

// An attached image, or a file with its first lines or its kind, and a Remove button.
export function ComposerAttachmentCard(
  props: ComposerAttachmentCardProps,
): React.JSX.Element {
  return (
    <View className={tileClass}>
      <AttachmentFrame attachment={props.attachment} />
      <RemoveButton {...props} />
    </View>
  );
}

function AttachmentFrame({ attachment }: PreviewProps): React.JSX.Element {
  const Preview = isPromptImage(attachment.mimeType)
    ? ImagePreview
    : FilePreview;

  return (
    <View className={cn(cardClass, cardBorder(attachment))}>
      <Preview attachment={attachment} />
    </View>
  );
}

type PreviewProps = { attachment: ComposerAttachment };

function ImagePreview({ attachment }: PreviewProps): React.JSX.Element {
  return (
    <View role="img" accessibilityLabel={attachment.name} className="size-full">
      <Image
        source={{ uri: attachment.uri }}
        aria-hidden
        accessibilityElementsHidden
        resizeMode="cover"
        className="size-full bg-muted"
      />
    </View>
  );
}

function FilePreview({ attachment }: PreviewProps): React.JSX.Element {
  return (
    <View role="img" accessibilityLabel={attachment.name} className="flex-1">
      {attachment.preview === undefined ? (
        <FileKind name={attachment.name} />
      ) : (
        <Text aria-hidden className={cn(previewClass, linesClass)}>
          {attachment.preview}
        </Text>
      )}
      <FileName name={attachment.name} />
    </View>
  );
}

function FileKind({ name }: { name: string }): React.JSX.Element {
  return (
    <View aria-hidden className={cn(previewClass, kindClass)}>
      <Icon name={fileTypeIcon(name)} className={mutedClass} />
      <Text role="badge" className={cn(mutedClass, 'wide-type:text-sm')}>
        {extensionOf(name)}
      </Text>
    </View>
  );
}

function FileName({ name }: { name: string }): React.JSX.Element {
  return (
    <View className="h-7 flex-row items-center gap-1.5 border-t border-border px-2">
      <Icon name={fileTypeIcon(name)} />
      <Text
        role="badge"
        numberOfLines={1}
        className="min-w-0 flex-1 text-muted-foreground wide-type:text-sm"
      >
        {name}
      </Text>
    </View>
  );
}

function RemoveButton(props: ComposerAttachmentCardProps): React.JSX.Element {
  return (
    <View className={cn(removeClass, removeHoverClass(props.disabled))}>
      <IconButton
        disabled={props.disabled}
        accessibilityLabel={`Remove ${props.attachment.name}`}
        icon="close"
        size="sm"
        variant="secondary"
        onPress={props.onRemove}
      />
    </View>
  );
}
