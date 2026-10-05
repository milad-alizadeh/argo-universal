import {
  ArrowUpIcon,
  PlusIcon,
  WarningCircleIcon,
  XIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Textarea } from '#primitives/textarea';
import { Icon } from './Icon';

const maximumImageBytes = 20 * 1024 * 1024;

export interface ComposerImage {
  id: string;
  name: string;
  uri: string;
  bytes: number;
}

export interface ComposerDraft {
  text: string;
  images: ComposerImage[];
}

export interface ComposerProps {
  draft: ComposerDraft;
  onDraftChange: (draft: ComposerDraft) => void;
  onAttachImages: () => void;
  onSend: (draft: ComposerDraft) => void;
  placeholder?: string;
  sending?: boolean;
  disabled?: boolean;
}

export function Composer({
  draft,
  onDraftChange,
  onAttachImages,
  onSend,
  placeholder = 'Message the Agent…',
  sending = false,
  disabled = false,
}: ComposerProps) {
  const [textHeight, setTextHeight] = useState<number>();
  const inactive = sending || disabled;
  const oversized = draft.images.filter(
    (image) => image.bytes > maximumImageBytes,
  );
  const canSend =
    !inactive &&
    oversized.length === 0 &&
    (draft.text.trim().length > 0 || draft.images.length > 0);
  return (
    <View className="w-full max-w-composer rounded-xl border border-input/80 bg-background/80 shadow-md web:backdrop-blur-composer web:backdrop-saturate-110">
      {draft.images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 px-4 pt-3"
        >
          {draft.images.map((image) => (
            <View key={image.id} className="w-40 h-30 shrink-0">
              <View
                className={cn(
                  'group relative w-40 h-30 overflow-hidden rounded-md border bg-muted',
                  image.bytes > maximumImageBytes
                    ? 'border-destructive'
                    : 'border-border',
                )}
              >
                <View
                  role="img"
                  accessibilityLabel={image.name}
                  className="w-full h-full"
                >
                  <Image
                    source={{ uri: image.uri }}
                    aria-hidden
                    accessibilityElementsHidden
                    resizeMode="cover"
                    className="w-full h-full"
                  />
                </View>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={inactive}
                  className={cn(
                    'absolute right-0 top-0 size-8 sm:size-8 active:bg-transparent dark:active:bg-transparent hover:bg-transparent dark:hover:bg-transparent web:wide:opacity-0',
                    inactive
                      ? 'web:wide:group-hover:opacity-50'
                      : 'web:wide:group-hover:opacity-100 web:wide:focus-visible:opacity-100',
                  )}
                  accessibilityLabel={`Remove ${image.name}`}
                  onPress={() =>
                    onDraftChange({
                      ...draft,
                      images: draft.images.filter(
                        (attached) => attached.id !== image.id,
                      ),
                    })
                  }
                >
                  <View className="size-4.5 items-center justify-center rounded-sm bg-background">
                    <Icon as={XIcon} className="size-2.5" />
                  </View>
                </Button>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      {oversized.length > 0 && (
        <View role="alert" className="mx-4 mt-2 flex-row items-start gap-2">
          <Icon
            as={WarningCircleIcon}
            className="size-3 text-destructive mt-0.5"
          />
          <Text
            className="min-w-0 flex-1 text-xs leading-4 text-destructive"
            numberOfLines={1}
          >
            Image exceeds 20 MB.
          </Text>
        </View>
      )}
      <View className="min-h-12 wide:min-h-14 px-4 pt-3 pb-1.5">
        <Textarea
          accessibilityLabel="Message"
          placeholder={placeholder}
          placeholderTextColorClassName="accent-muted-foreground"
          value={draft.text}
          editable={!inactive}
          onChangeText={(text) => onDraftChange({ ...draft, text })}
          numberOfLines={Platform.OS === 'web' ? 1 : undefined}
          onContentSizeChange={(event) =>
            setTextHeight(event.nativeEvent.contentSize.height)
          }
          style={Platform.OS === 'web' ? undefined : { height: textHeight }}
          className="min-h-6 wide:min-h-5 border-0 rounded-none bg-transparent dark:bg-transparent p-0 text-base wide:text-sm leading-6 wide:leading-5 shadow-none web:resize-none web:focus-visible:ring-0"
        />
      </View>
      <View className="flex-row items-center justify-between gap-2 p-2">
        <View
          pointerEvents={inactive ? 'none' : 'auto'}
          className={cn('min-w-0 flex-1 flex-row items-center gap-0.5')}
        >
          <Button
            variant="ghost"
            size="icon"
            disabled={inactive}
            className="size-8 sm:size-8"
            accessibilityLabel="Attach images"
            onPress={onAttachImages}
          >
            <Icon as={PlusIcon} className="size-4 text-muted-foreground" />
          </Button>
        </View>
        <View className="flex-row items-center gap-1">
          <Button
            size="icon"
            className={cn(
              'size-8 sm:size-8',
              sending && 'opacity-100',
              !canSend && !sending && 'opacity-35',
            )}
            accessibilityLabel="Send"
            disabled={!canSend}
            onPress={() => {
              if (canSend) onSend(draft);
            }}
          >
            {sending ? (
              <ActivityIndicator
                accessibilityLabel="Sending"
                size={16}
                role="progressbar"
                colorClassName="accent-primary-foreground"
                className="size-4"
              />
            ) : (
              <Icon
                as={ArrowUpIcon}
                className="size-4 text-primary-foreground"
              />
            )}
          </Button>
        </View>
      </View>
    </View>
  );
}
