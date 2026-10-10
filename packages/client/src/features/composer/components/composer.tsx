import { maxBlobUploadBytes, maxBlobUploadMebibytes } from '@repo/contracts';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import { Image, Platform, ScrollView, View } from 'react-native';
import {
  PlanProposalCard,
  type PlanProposalCardProps,
} from '#features/requests';
import { Text } from '#lib/generic/primitives/text';
import { Textarea } from '#lib/generic/primitives/textarea';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import {
  Pressable,
  contentActionClass,
} from '../../../lib/generic/primitives/pressable';
import { Icon, IconSpinner } from '../../../lib/generic/symbols/icon';
import {
  ComposerAgentModelControl,
  ComposerCheckoutControl,
  type ComposerConfigurationProps,
  ComposerModeControl,
} from './composer-configuration';
import { ComposerGlyph } from './composer-glyph';
import { ComposerOptions } from './composer-options';
import { ComposerPopover } from './composer-popover';
import {
  ComposerPlan,
  ComposerStatusControls,
  type ComposerStatusProps,
  ComposerWorkChips,
} from './composer-status';
import { WrittenPlan, type WrittenPlanValue } from './written-plan';

// The message field grows a line at a time up to this many lines, then scrolls.
const maximumVisibleLines = 4;
const lineHeight = 20;
const maximumTextHeight = maximumVisibleLines * lineHeight;

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
  planProposal?: PlanProposalCardProps;
  writtenPlan?: WrittenPlanValue;
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
  // False when Send can't work but the draft stays editable, as while the Connection is down.
  sendable?: boolean;
  // Shown in the Composer's warning line, as when a New Session fails to start.
  error?: string;
}

export function Composer({
  draft,
  planProposal,
  writtenPlan,
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
  sendable = true,
  error,
}: ComposerProps): React.JSX.Element {
  const composerId = useId();
  const wide = useContentWide();
  const shownWrittenPlan = planProposal ? undefined : writtenPlan;
  const [attachHighlighted, setAttachHighlighted] = useState(false);
  const [textHeight, setTextHeight] = useState(
    Math.min(maximumVisibleLines, draft.text.split('\n').length) * lineHeight,
  );
  const inactive = sending || disabled;
  const canRecoverAgent = Boolean(
    configuration?.onAgentRetry &&
    configuration.agents.every((agent) => agent.availability !== 'available'),
  );
  const configurationInactive = sending || (disabled && !canRecoverAgent);
  const oversized = draft.images.filter(
    (image) => image.bytes > maxBlobUploadBytes,
  );
  const sendState = sendButtonState({
    stop: Boolean(configuration?.turnRunning && onStop),
    sending,
    ready:
      !inactive &&
      sendable &&
      !configuration?.turnRunning &&
      oversized.length === 0 &&
      (draft.text.trim().length > 0 || draft.images.length > 0),
  });
  let sendButtonContent: ReactNode;
  if (sendState === 'stop') {
    sendButtonContent = (
      <View className="size-2.5 rounded-xs bg-primary-foreground" />
    );
  } else if (sendState === 'sending') {
    sendButtonContent = (
      <IconSpinner
        accessibilityLabel="Sending"
        role="progressbar"
        colorClassName="accent-primary-foreground"
      />
    );
  } else {
    sendButtonContent = (
      <Icon name="arrow-up" className="text-primary-foreground" />
    );
  }
  const planControls = (
    <>
      {!!status?.plan?.length && (
        <ComposerPlan entries={status.plan} disabled={inactive} />
      )}
      {!!shownWrittenPlan && (
        <WrittenPlan
          key={shownWrittenPlan.planId}
          plan={shownWrittenPlan}
          composerId={composerId}
        />
      )}
    </>
  );
  return (
    <View nativeID={composerId} className="w-full max-w-composer items-center">
      {!wide &&
        (shownWrittenPlan ||
          status?.plan?.length ||
          status?.subagents ||
          status?.shells) && (
          <View className="min-h-7 max-w-full mb-1 flex-row flex-wrap items-center justify-center gap-2">
            {planControls}
            {status && (
              <ComposerWorkChips status={status} disabled={inactive} />
            )}
          </View>
        )}
      {wide &&
        !planProposal &&
        (!!shownWrittenPlan || !!status?.plan?.length) && (
          <View className="self-stretch mx-1.75 -mb-3 pb-3 rounded-t-lg border border-b-0 border-border bg-sidebar/80 shadow-composer web:backdrop-blur-composer web:backdrop-saturate-110">
            {planControls}
          </View>
        )}
      {planProposal ? (
        <PlanProposalCard {...planProposal} />
      ) : (
        <View className="w-full rounded-xl border border-border bg-background/80 native:bg-background shadow-composer web:backdrop-blur-composer web:backdrop-saturate-110 z-10">
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
                      image.bytes > maxBlobUploadBytes
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
                    <Pressable
                      disabled={inactive}
                      accessibilityLabel={`Remove ${image.name}`}
                      onPress={() =>
                        onDraftChange({
                          ...draft,
                          images: draft.images.filter(
                            (attached) => attached.id !== image.id,
                          ),
                        })
                      }
                      role="button"
                      className={contentActionClass({
                        variant: 'ghost',
                        className: cn(
                          'absolute right-0 top-0 size-8 sm:size-8 p-0 active:bg-transparent dark:active:bg-transparent hover:bg-transparent dark:hover:bg-transparent web:wide:opacity-0',
                          inactive
                            ? 'web:wide:group-hover:opacity-50'
                            : 'web:wide:group-hover:opacity-100 web:wide:focus-visible:opacity-100',
                        ),
                        disabled: inactive,
                      })}
                    >
                      <View className="size-5 items-center justify-center rounded-sm bg-background">
                        <ComposerGlyph name="remove" size="sm" />
                      </View>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
          {oversized.length > 0 && (
            <ComposerWarning numberOfLines={1}>
              {`Image exceeds ${maxBlobUploadMebibytes} MB.`}
            </ComposerWarning>
          )}
          {error && <ComposerWarning>{error}</ComposerWarning>}
          <View className="px-4 pt-3 pb-2">
            <Textarea
              accessibilityLabel="Message"
              placeholder={placeholder}
              placeholderTextColorClassName="accent-muted-foreground/70"
              value={draft.text}
              editable={!inactive}
              onChangeText={(text) => onDraftChange({ ...draft, text })}
              numberOfLines={Platform.OS === 'web' ? 1 : maximumVisibleLines}
              scrollEnabled={
                Platform.OS === 'web' || textHeight >= maximumTextHeight
              }
              onContentSizeChange={(event) =>
                setTextHeight(
                  Math.max(
                    lineHeight,
                    Math.min(
                      maximumTextHeight,
                      event.nativeEvent.contentSize.height,
                    ),
                  ),
                )
              }
              style={Platform.OS === 'web' ? undefined : { height: textHeight }}
              className="min-h-5 max-h-20 web:overflow-y-auto border-0 rounded-none bg-transparent dark:bg-transparent p-0 type-control shadow-none web:resize-none web:focus-visible:ring-0"
            />
          </View>
          <View className="flex-row items-center justify-between gap-2 pl-3.75 pr-2.5 pb-2.5">
            <View
              pointerEvents={configurationInactive ? 'none' : 'auto'}
              className={cn('min-w-0 flex-1 flex-row items-center gap-1')}
            >
              <ComposerPopover
                label="Attach"
                width={248}
                trigger={
                  <Pressable
                    disabled={inactive}
                    onHoverIn={() => setAttachHighlighted(true)}
                    onHoverOut={() => setAttachHighlighted(false)}
                    onPressIn={() => setAttachHighlighted(true)}
                    onPressOut={() => setAttachHighlighted(false)}
                    hitSlop={8}
                    accessibilityLabel={wide ? 'Attach' : 'Attach images'}
                    role="button"
                    className={contentActionClass({
                      variant: 'ghost',
                      className:
                        'h-7 sm:h-7 w-4 sm:w-4 mr-1.5 p-0 hover:bg-transparent active:bg-transparent dark:hover:bg-transparent dark:active:bg-transparent',
                      disabled: inactive,
                    })}
                  >
                    <View
                      pointerEvents="none"
                      className={cn(
                        'absolute -left-1.5 top-0 size-7 rounded-md z-0',
                        attachHighlighted && !inactive && 'bg-accent',
                      )}
                    />
                    <View className="relative z-10">
                      <Icon name="add" className="text-muted-foreground" />
                    </View>
                  </Pressable>
                }
              >
                {(close) => (
                  <View className="p-1">
                    {(wide
                      ? [
                          {
                            label: 'Files and Folder',
                            icon: 'folder' as const,
                            onPress: onAttachFiles ?? onAttachImages,
                          },
                          {
                            label: 'Slash Commands',
                            icon: 'code' as const,
                            onPress: onSelectSlashCommand,
                          },
                          {
                            label: 'Goal',
                            icon: 'goal' as const,
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
                      <Pressable
                        key={item.label}
                        accessibilityLabel={item.label}
                        disabled={!item.onPress}
                        onPress={() => close(item.onPress)}
                        role="button"
                        className={contentActionClass({
                          variant: 'ghost',
                          className:
                            'h-12 sm:h-12 wide:h-11 wide:sm:h-11 rounded-sm px-3 gap-3 justify-start',
                          disabled: !item.onPress,
                        })}
                      >
                        <View className="size-8 rounded-full bg-muted wide:size-auto wide:rounded-none wide:bg-transparent items-center justify-center">
                          {'glyph' in item ? (
                            <ComposerGlyph name={item.glyph} />
                          ) : (
                            <Icon
                              name={item.icon}
                              className="text-foreground"
                            />
                          )}
                        </View>
                        <Text
                          selectable={false}
                          className="select-none type-body"
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </ComposerPopover>
              {configuration && (
                <ComposerAgentModelControl
                  configuration={configuration}
                  disabled={configurationInactive}
                />
              )}
              {!wide && status && (
                <ComposerStatusControls status={status} disabled={inactive} />
              )}
            </View>
            <View className="flex-row items-center gap-2.5">
              {configuration && (
                <ComposerOptions
                  configuration={configuration}
                  disabled={inactive}
                />
              )}
              {configuration && (
                <ComposerModeControl
                  configuration={configuration}
                  disabled={inactive}
                />
              )}
              <Pressable
                accessibilityLabel={sendState === 'stop' ? 'Stop' : 'Send'}
                disabled={
                  sendState === 'stop' ? disabled : sendState !== 'ready'
                }
                onPress={
                  sendState === 'stop'
                    ? (): void => onStop?.()
                    : (): void => {
                        if (sendState === 'ready') onSend(draft);
                      }
                }
                role="button"
                className={contentActionClass({
                  variant: 'default',
                  className: cn(
                    'size-7 sm:size-7 rounded-full p-0',
                    sendState !== 'stop' && wide && 'shadow-none!',
                    (sendState === 'sending' || sendState === 'stop') &&
                      'opacity-100',
                    sendState === 'blocked' && 'opacity-35',
                  ),
                  disabled:
                    sendState === 'stop' ? disabled : sendState !== 'ready',
                })}
              >
                {sendButtonContent}
              </Pressable>
            </View>
          </View>
        </View>
      )}
      {wide && (configuration || status) && (
        <View
          className={cn(
            'h-11 self-stretch mx-1.75 -mt-3 pt-3 pr-2.5 rounded-b-lg border border-t-0 border-border bg-sidebar/80 shadow-composer web:backdrop-blur-composer web:backdrop-saturate-110',
          )}
        >
          <View className="flex-1 min-h-0 flex-row items-center pl-0.5 gap-1">
            {status && (
              <View>
                <ComposerStatusControls status={status} disabled={inactive} />
              </View>
            )}
            <View className="flex-1" />
            {configuration && (
              <View>
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

function sendButtonState(conditions: {
  stop: boolean;
  sending: boolean;
  ready: boolean;
}): 'stop' | 'sending' | 'ready' | 'blocked' {
  const candidates = [
    ['stop', conditions.stop],
    ['sending', conditions.sending],
    ['ready', conditions.ready],
  ] as const;
  return candidates.find(([, active]) => active)?.[0] ?? 'blocked';
}

function ComposerWarning({
  numberOfLines,
  children,
}: {
  numberOfLines?: number;
  children: string;
}): React.JSX.Element {
  return (
    <View role="alert" className="mx-4 mt-2 flex-row items-start gap-2">
      <ComposerGlyph name="warning" className="text-destructive" />
      <Text
        className="min-w-0 flex-1 type-secondary text-destructive"
        numberOfLines={numberOfLines}
      >
        {children}
      </Text>
    </View>
  );
}
