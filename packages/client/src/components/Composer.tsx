import {
  ArrowUpIcon,
  CodeIcon,
  FolderIcon,
  PlusIcon,
  TargetIcon,
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
import { useWide } from '../navigation/use-wide';
import {
  ComposerAgentModelControl,
  ComposerCheckoutControl,
  type ComposerConfigurationProps,
  ComposerModeControl,
} from './ComposerConfiguration';
import { ComposerGlyph } from './ComposerGlyph';
import { ComposerPopover } from './ComposerPopover';
import {
  ComposerPlan,
  ComposerStatusControls,
  type ComposerStatusProps,
  ComposerWorkChips,
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
  const [attachHighlighted, setAttachHighlighted] = useState(false);
  const [textHeight, setTextHeight] = useState(
    Math.min(4, draft.text.split('\n').length) * 20,
  );
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
      {!wide &&
        (configuration?.checkout.onNewWorktreeChange ||
          configuration?.checkout.path ||
          status?.plan?.length ||
          status?.subagents ||
          status?.shells) && (
          <View className="min-h-7 max-w-full mb-1 flex-row flex-wrap items-center justify-center gap-2">
            {configuration?.checkout.onNewWorktreeChange ? (
              <ComposerCheckoutControl
                checkout={configuration.checkout}
                disabled={inactive}
              />
            ) : (
              <>
                {configuration?.checkout.path && (
                  <ComposerCheckoutControl
                    checkout={configuration.checkout}
                    disabled={inactive}
                  />
                )}
                {!!status?.plan?.length && (
                  <ComposerPlan entries={status.plan} disabled={inactive} />
                )}
                {status && (
                  <ComposerWorkChips status={status} disabled={inactive} />
                )}
              </>
            )}
          </View>
        )}
      {wide && !!status?.plan?.length && (
        <View className="self-stretch mx-1.75 -mb-3 pb-3 rounded-t-lg border border-b-0 border-border bg-sidebar/80 shadow-composer web:backdrop-blur-composer web:backdrop-saturate-110">
          <ComposerPlan entries={status.plan} disabled={inactive} />
        </View>
      )}
      <View className="w-full rounded-xl border border-border bg-background/80 shadow-composer web:backdrop-blur-composer web:backdrop-saturate-110 z-10">
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
                      <ComposerGlyph name="remove" size={10} />
                    </View>
                  </Button>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        {oversized.length > 0 && (
          <View role="alert" className="mx-4 mt-2 flex-row items-center gap-2">
            <View className="size-3 mt-0.5">
              <ComposerGlyph
                name="warning"
                size={12}
                className="text-destructive"
              />
            </View>
            <Text
              className="min-w-0 flex-1 text-xs leading-4 text-destructive"
              numberOfLines={1}
            >
              Image exceeds 20 MB.
            </Text>
          </View>
        )}
        <View className="px-4 pt-3 pb-2">
          <Textarea
            accessibilityLabel="Message"
            placeholder={placeholder}
            placeholderTextColorClassName="accent-muted-foreground/70"
            value={draft.text}
            editable={!inactive}
            onChangeText={(text) => onDraftChange({ ...draft, text })}
            numberOfLines={Platform.OS === 'web' ? 1 : 4}
            scrollEnabled={Platform.OS === 'web' || textHeight >= 80}
            onContentSizeChange={(event) =>
              setTextHeight(
                Math.max(
                  20,
                  Math.min(80, event.nativeEvent.contentSize.height),
                ),
              )
            }
            style={Platform.OS === 'web' ? undefined : { height: textHeight }}
            className="min-h-5 max-h-20 web:overflow-y-auto border-0 rounded-none bg-transparent dark:bg-transparent p-0 text-sm leading-5 shadow-none web:resize-none web:focus-visible:ring-0"
          />
        </View>
        <View className="flex-row items-center justify-between gap-2 pl-3.75 pr-2.5 pb-2.5">
          <View
            pointerEvents={inactive ? 'none' : 'auto'}
            className={cn('min-w-0 flex-1 flex-row items-center gap-1')}
          >
            <ComposerPopover
              label="Attach"
              width={248}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={inactive}
                  className="h-7 sm:h-7 w-4 sm:w-4 mr-1.5 p-0 hover:bg-transparent active:bg-transparent dark:hover:bg-transparent dark:active:bg-transparent"
                  onHoverIn={() => setAttachHighlighted(true)}
                  onHoverOut={() => setAttachHighlighted(false)}
                  onPressIn={() => setAttachHighlighted(true)}
                  onPressOut={() => setAttachHighlighted(false)}
                  hitSlop={8}
                  accessibilityLabel="Attach images"
                >
                  <View
                    pointerEvents="none"
                    className={cn(
                      'absolute -left-1.5 top-0 size-7 rounded-md z-0',
                      attachHighlighted && !inactive && 'bg-accent',
                    )}
                  />
                  <View className="relative z-10 size-4">
                    <Icon
                      as={PlusIcon}
                      className="size-4 text-muted-foreground"
                    />
                  </View>
                </Button>
              }
            >
              {(close) => (
                <View className="p-1">
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
                                glyph: 'camera' as const,
                                onPress: onAttachCamera,
                              },
                            ]
                          : []),
                        {
                          label: 'Photos',
                          glyph: 'photos' as const,
                          onPress: onAttachImages,
                        },
                        ...(onAttachFiles
                          ? [
                              {
                                label: 'Files',
                                glyph: 'files' as const,
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
                      className="h-12 sm:h-12 wide:h-11 wide:sm:h-11 rounded-sm px-3 gap-3 justify-start"
                      onPress={() => {
                        close();
                        item.onPress?.();
                      }}
                    >
                      <View className="size-8 rounded-full bg-muted wide:w-5 wide:h-4.5 wide:rounded-none wide:bg-transparent items-center justify-center">
                        {'glyph' in item ? (
                          <ComposerGlyph name={item.glyph} size={18} />
                        ) : (
                          <Icon
                            as={item.icon}
                            className="size-4.5 text-foreground"
                          />
                        )}
                      </View>
                      <Text
                        selectable={false}
                        className="select-none text-sm leading-5 font-normal"
                      >
                        {item.label}
                      </Text>
                    </Button>
                  ))}
                </View>
              )}
            </ComposerPopover>
            {configuration && (
              <ComposerAgentModelControl
                configuration={configuration}
                disabled={inactive}
              />
            )}
            {!wide && status && (
              <ComposerStatusControls status={status} disabled={inactive} />
            )}
          </View>
          <View className="flex-row items-center gap-2.5">
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
                !showStop && 'wide:shadow-none!',
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
      {wide && (configuration || status) && (
        <View
          className={cn(
            'h-11 self-stretch mx-1.75 -mt-3 pt-3 pr-2.5 rounded-b-lg border border-t-0 border-border bg-sidebar/80 shadow-composer web:backdrop-blur-composer web:backdrop-saturate-110',
          )}
        >
          <View className="flex-1 min-h-0 flex-row items-center pl-0.5 gap-1">
            {status && (
              <View className={status.plan?.length ? 'hidden wide:flex' : ''}>
                <ComposerStatusControls status={status} disabled={inactive} />
              </View>
            )}
            <View className="flex-1" />
            {configuration && (
              <View className="hidden wide:flex">
                <ComposerCheckoutControl
                  checkout={configuration.checkout}
                  disabled={inactive}
                />
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
