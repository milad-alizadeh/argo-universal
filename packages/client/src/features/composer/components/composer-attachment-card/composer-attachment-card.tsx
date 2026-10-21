import { isPromptImage, maxBlobUploadBytes } from '@repo/contracts';
import type * as React from 'react';
import { Image, Platform, View } from 'react-native';
import { fileTypeIcon } from '#lib/generic/symbols/file-type-icon';
import { cn } from '#lib/generic/utils';
import { IconButton } from '#primitives/actions/icon-button';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';

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

const removeClass = 'absolute rounded-full web:rounded-full web:wide:opacity-0';

// Phones draw a small card-coloured disc tight in the corner (Paper); hitSlop restores the 44 (iOS) or 48 (Android) target.
const phoneRemove = {
  variant: 'ghost',
  iconRole: 'badge',
  className:
    'right-1.25 top-1.25 size-2.5 sm:size-2.5 min-h-0 min-w-0 bg-card active:bg-muted',
} as const;

const removeFit = Platform.select({
  /*
   * Paper's disc, the one the phones took: 10 with its 6 mark, tight in the corner, rather than the xs button that
   * stood a third as wide as the tile. hitSlop keeps a pointer's target; the web's own disc stays filled.
   */
  web: {
    variant: 'filled',
    iconRole: 'badge',
    className: 'right-1.25 top-1.25 size-2.5 sm:size-2.5 min-h-0 min-w-0',
    hitSlop: 9,
  },
  android: {
    ...phoneRemove,
    className:
      'right-1.25 top-1.25 size-2.5 sm:size-2.5 min-h-0 min-w-0 android:min-h-0 android:min-w-0 bg-card active:bg-muted',
    hitSlop: 19,
  },
  default: { ...phoneRemove, hitSlop: 17 },
} as const);

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
      <Icon role="control" name={fileTypeIcon(name)} className={mutedClass} />
      <Text role="badge" className={mutedClass}>
        {extensionOf(name)}
      </Text>
    </View>
  );
}

function FileName({ name }: { name: string }): React.JSX.Element {
  return (
    <View className="h-7 flex-row items-center gap-1.5 border-t border-border px-2">
      <Icon role="control" name={fileTypeIcon(name)} />
      <Text
        role="badge"
        numberOfLines={1}
        className="min-w-0 flex-1 text-muted-foreground"
      >
        {name}
      </Text>
    </View>
  );
}

function RemoveButton(props: ComposerAttachmentCardProps): React.JSX.Element {
  const { className, ...fit } = removeFit;

  return (
    <IconButton
      {...fit}
      disabled={props.disabled}
      accessibilityLabel={`Remove ${props.attachment.name}`}
      icon="close"
      size="xs"
      className={cn(removeClass, className, removeHoverClass(props.disabled))}
      onPress={props.onRemove}
    />
  );
}
