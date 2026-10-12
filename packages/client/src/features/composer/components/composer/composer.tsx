import { maxBlobUploadBytes, maxBlobUploadMebibytes } from '@repo/contracts';
import type * as React from 'react';
import { useId } from 'react';
import { Image, ScrollView, View } from 'react-native';
import {
  PlanProposalCard,
  type PlanProposalCardProps,
} from '#features/requests';
import { LiquidGlass } from '#lib/generic/primitives/display/liquid-glass/liquid-glass';
import { Text } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { IconButton } from '#primitives/buttons/icon-button/icon-button';
import { FieldGroup } from '#primitives/fields/field-group/field-group';
import { FieldSection } from '#primitives/fields/field-section/field-section';
import { RichTextarea } from '#primitives/inputs/rich-textarea/rich-textarea';
import { ListItem } from '#primitives/lists/list-item/list-item';
import { Icon } from '../../../../lib/generic/symbols/icon';
import {
  ComposerAgentModelControl,
  ComposerCheckoutControl,
  type ComposerConfigurationProps,
  ComposerModeControl,
} from '../composer-configuration/composer-configuration';
import { ComposerOptions } from '../composer-options/composer-options';
import { ComposerPopover } from '../composer-popover/composer-popover';
import {
  ComposerPlan,
  ComposerStatusControls,
  type ComposerStatusProps,
  ComposerWorkChips,
} from '../composer-status/composer-status';
import {
  WrittenPlan,
  type WrittenPlanValue,
} from '../written-plan/written-plan';

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
  const send = (): void => {
    if (sendState === 'ready') onSend(draft);
  };
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
    <View nativeID={composerId} className="w-full items-center">
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
          <View className="self-stretch mx-1.75 -mb-3 pb-3 rounded-t-2xl bg-glass-muted shadow-glass-tray web:backdrop-blur-glass web:backdrop-saturate-180">
            {planControls}
          </View>
        )}
      {planProposal ? (
        <PlanProposalCard {...planProposal} />
      ) : (
        // Wide, the card sits between its glass trays and keeps Argo's own glass.
        <LiquidGlass
          shape="card"
          glass={!wide}
          className="w-full z-10"
          fallbackClassName="rounded-2xl bg-glass-card native:bg-background shadow-glass web:backdrop-blur-glass web:backdrop-saturate-180"
        >
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
                    <IconButton
                      disabled={inactive}
                      accessibilityLabel={`Remove ${image.name}`}
                      icon="close"
                      iconRole="secondary"
                      variant="ghost"
                      className={cn(
                        'absolute right-0 top-0 size-8 sm:size-8 rounded-sm bg-background web:wide:opacity-0',
                        inactive
                          ? 'web:wide:group-hover:opacity-50'
                          : 'web:wide:group-hover:opacity-100 web:wide:focus-visible:opacity-100',
                      )}
                      onPress={() =>
                        onDraftChange({
                          ...draft,
                          images: draft.images.filter(
                            (attached) => attached.id !== image.id,
                          ),
                        })
                      }
                    />
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
            <RichTextarea
              accessibilityLabel="Message"
              placeholder={placeholder}
              value={draft.text}
              editable={!inactive}
              onChangeText={(text) => onDraftChange({ ...draft, text })}
              onSubmit={send}
            />
          </View>
          <View className="flex-row items-center justify-between gap-2 pl-3.75 pr-2.5 pb-2.5">
            <View
              pointerEvents={configurationInactive ? 'none' : 'auto'}
              className={cn('min-w-0 flex-1 flex-row items-center gap-1')}
            >
              <ComposerPopover
                listContent
                label="Attach"
                trigger={
                  <IconButton
                    disabled={inactive}
                    icon="add"
                    variant="ghost"
                    iconRole="control"
                    hitSlop={8}
                    accessibilityLabel={wide ? 'Attach' : 'Attach images'}
                    className="size-7 sm:size-7 p-0"
                    iconClassName="text-muted-foreground"
                  />
                }
              >
                {(close) => (
                  <View className="native:flex-1 wide:p-3 bg-sidebar">
                    <FieldGroup fit>
                      <FieldSection>
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
                                      icon: 'camera' as const,
                                      onPress: onAttachCamera,
                                    },
                                  ]
                                : []),
                              {
                                label: 'Photos',
                                icon: 'photos' as const,
                                onPress: onAttachImages,
                              },
                              ...(onAttachFiles
                                ? [
                                    {
                                      label: 'Files',
                                      icon: 'attach' as const,
                                      onPress: onAttachFiles,
                                    },
                                  ]
                                : []),
                            ]
                        ).map((item) => (
                          <ListItem
                            key={item.label}
                            title={item.label}
                            icon={item.icon}
                            role="button"
                            disclosure={false}
                            disabled={!item.onPress}
                            onPress={() => close(item.onPress)}
                          />
                        ))}
                      </FieldSection>
                    </FieldGroup>
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
              <IconButton
                accessibilityLabel={sendState === 'stop' ? 'Stop' : 'Send'}
                icon={sendState === 'stop' ? 'cancelled' : 'arrow-up'}
                filled
                loading={sendState === 'sending'}
                disabled={
                  sendState === 'stop' ? disabled : sendState !== 'ready'
                }
                onPress={sendState === 'stop' ? (): void => onStop?.() : send}
                className={cn(
                  'size-7 sm:size-7 rounded-full',
                  sendState === 'blocked' && 'opacity-35',
                )}
                iconRole="control"
                iconClassName="text-primary-foreground"
              />
            </View>
          </View>
        </LiquidGlass>
      )}
      {wide && (configuration || status) && (
        <View
          className={cn(
            'h-11 self-stretch mx-1.75 -mt-3 pt-3 pr-2.5 rounded-b-2xl bg-glass-muted shadow-glass-tray web:backdrop-blur-glass web:backdrop-saturate-180',
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
      <Icon role="control" name="error" className="text-destructive" />
      <Text
        role="secondary"
        className="min-w-0 flex-1 text-destructive"
        numberOfLines={numberOfLines}
      >
        {children}
      </Text>
    </View>
  );
}
