import {
  ArrowUpIcon,
  CameraIcon,
  CodeIcon,
  FolderIcon,
  ImageIcon,
  PaperclipIcon,
  PlusIcon,
  TargetIcon,
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
import { useResolveClassNames } from 'uniwind';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Textarea } from '#primitives/textarea';
import { useWide } from '../navigation/use-wide';
import {
  ComposerAgentControl,
  ComposerCheckoutControl,
  type ComposerConfigurationProps,
  ComposerModeControl,
  ComposerModelControl,
} from './ComposerConfiguration';
import { ComposerPopover } from './ComposerPopover';
import {
  ComposerPlan,
  ComposerStatusControls,
  type ComposerStatusProps,
} from './ComposerStatus';
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
  onAttachCamera?: () => void;
  onAttachFiles?: () => void;
  onSelectSlashCommand?: () => void;
  onCreateGoal?: () => void;
  onSend: (draft: ComposerDraft) => void;
  onStop?: () => void;
  configuration?: ComposerConfigurationProps;
  status?: ComposerStatusProps;
  placeholder?: string;
  sending?: boolean;
  disabled?: boolean;
}

export function Composer({
  draft,
  onDraftChange,
  onAttachImages,
  onAttachCamera,
  onAttachFiles,
  onSelectSlashCommand,
  onCreateGoal,
  onSend,
  onStop,
  configuration,
  status,
  placeholder = 'Message the Agent…',
  sending = false,
  disabled = false,
}: ComposerProps) {
  const wide = useWide();
  const [textHeight, setTextHeight] = useState<number>();
  const sendingColor = useResolveClassNames('text-primary-foreground').color;
  const inactive = sending || disabled;
  const showStop = configuration?.turnRunning && onStop;
  const oversized = draft.images.filter(
    (image) => image.bytes > maximumImageBytes,
  );
  const canSend =
    !inactive &&
    !configuration?.turnRunning &&
    oversized.length === 0 &&
    (draft.text.trim().length > 0 || draft.images.length > 0);
  return (
    <View className="w-full max-w-composer items-center">
      {status?.plan && status.plan.length > 0 && (
        <View className="self-stretch mx-3 -mb-3 pb-3 rounded-t-lg border border-b-0 border-border bg-sidebar/80 web:backdrop-blur-composer web:backdrop-saturate-110">
          <View className="h-10 wide:h-9 flex-row items-center px-2 gap-1">
            <View className="wide:flex-1 min-w-0">
              <ComposerPlan entries={status.plan} disabled={inactive} />
            </View>
            <View className="flex-1" />
            <View className="wide:hidden">
              <ComposerStatusControls status={status} disabled={inactive} />
            </View>
          </View>
        </View>
      )}
      <View className="w-full rounded-xl border border-input/80 bg-background/80 shadow-md web:backdrop-blur-composer web:backdrop-saturate-110 z-10">
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
            <ComposerPopover
              label="Attach"
              width={248}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={inactive}
                  className="size-8 sm:size-8"
                  accessibilityLabel="Attach images"
                >
                  <Icon
                    as={PlusIcon}
                    className="size-4 text-muted-foreground"
                  />
                </Button>
              }
            >
              {(close) => (
                <View className="pt-1 pb-2 wide:p-1">
                  {(wide
                    ? [
                        {
                          label: 'Files and Folder',
                          icon: FolderIcon,
                          onPress: onAttachFiles ?? onAttachImages,
                        },
                        {
                          label: 'Slash Commands',
                          icon: CodeIcon,
                          onPress: onSelectSlashCommand,
                        },
                        {
                          label: 'Goal',
                          icon: TargetIcon,
                          onPress: onCreateGoal,
                        },
                      ]
                    : [
                        ...(onAttachCamera
                          ? [
                              {
                                label: 'Camera',
                                icon: CameraIcon,
                                onPress: onAttachCamera,
                              },
                            ]
                          : []),
                        {
                          label: 'Photos',
                          icon: ImageIcon,
                          onPress: onAttachImages,
                        },
                        ...(onAttachFiles
                          ? [
                              {
                                label: 'Files',
                                icon: PaperclipIcon,
                                onPress: onAttachFiles,
                              },
                            ]
                          : []),
                      ]
                  ).map((item) => (
                    <Button
                      key={item.label}
                      variant="ghost"
                      accessibilityLabel={item.label}
                      disabled={!item.onPress}
                      className="h-14 sm:h-14 wide:h-11 wide:sm:h-11 rounded-none wide:rounded-sm px-4 wide:px-3 gap-3 justify-start"
                      onPress={() => {
                        close();
                        item.onPress?.();
                      }}
                    >
                      <View className="size-9 wide:w-5 wide:h-4.5 rounded-full bg-muted wide:bg-transparent items-center justify-center">
                        <Icon
                          as={item.icon}
                          className="size-5 wide:size-4.5 text-foreground"
                        />
                      </View>
                      <Text
                        selectable={false}
                        className="select-none text-base wide:text-sm"
                      >
                        {item.label}
                      </Text>
                    </Button>
                  ))}
                </View>
              )}
            </ComposerPopover>
            {configuration && (
              <>
                <ComposerAgentControl
                  configuration={configuration}
                  disabled={inactive}
                />
                <ComposerModelControl
                  configuration={configuration}
                  disabled={inactive}
                />
              </>
            )}
          </View>
          <View className="flex-row items-center gap-1">
            {configuration && (
              <ComposerModeControl
                configuration={configuration}
                disabled={inactive}
              />
            )}
            <Button
              size="icon"
              className={cn(
                'size-7 sm:size-7 rounded-full',
                (sending || showStop) && 'opacity-100',
                !canSend && !sending && !showStop && 'opacity-35',
              )}
              accessibilityLabel={showStop ? 'Stop' : 'Send'}
              disabled={showStop ? disabled : !canSend}
              onPress={() => {
                if (showStop) {
                  onStop();
                  return;
                }
                if (canSend) onSend(draft);
              }}
            >
              {showStop ? (
                <View className="size-2.5 rounded-xs bg-primary-foreground" />
              ) : sending ? (
                <ActivityIndicator
                  accessibilityLabel="Sending"
                  size={16}
                  role="progressbar"
                  colorClassName="accent-primary-foreground"
                  color={sendingColor}
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
      {(configuration || status) && (
        <View className="self-stretch mx-3 -mt-3 pt-3 rounded-b-lg border border-t-0 border-border bg-sidebar/80 web:backdrop-blur-composer web:backdrop-saturate-110">
          <View className="min-h-9 flex-row items-center px-2">
            {status && (
              <View className={status.plan?.length ? 'hidden wide:flex' : ''}>
                <ComposerStatusControls status={status} disabled={inactive} />
              </View>
            )}
            <View className="flex-1" />
            {configuration && (
              <ComposerCheckoutControl
                checkout={configuration.checkout}
                disabled={inactive}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}
