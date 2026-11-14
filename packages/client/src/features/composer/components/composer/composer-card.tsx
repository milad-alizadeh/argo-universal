import { Button } from '@repo/kit/primitives/actions/button';
import { LiquidGlass } from '@repo/kit/primitives/content/liquid-glass';
import {
  RichTextarea,
  SuggestionListHost,
} from '@repo/kit/primitives/controls/rich-textarea';
import type * as React from 'react';
import { Platform, View, ScrollView } from 'react-native';
import { useFollowUpSuggestion } from '../../hooks/use-follow-up-suggestion';
import { ComposerAttachmentCard } from '../composer-attachment-card/composer-attachment-card';
import type {
  CardLayout,
  AttachmentLayout,
  TextLayout,
} from './composer-card-types';
import { draftChanges, useSuggestionSources } from './composer-text-draft';
import { ComposerToolbar } from './composer-toolbar';
import { ComposerBottomTray } from './composer-trays';
import type { ComposerDraft } from './composer-types';

/*
 * `min-h-0 shrink`, so the card gives height up to the room left above the keyboard rather than running on
 * past it. Inside the card only the draft field gives any up; the toolbar keeps its own (#1529).
 */
const cardGlass = {
  // The web's card shares its trays' and the glass sidebar's radius; a phone keeps its sheet's.
  corners: Platform.OS === 'web' ? 'container' : 'sheet',
  interactive: true,
  className: 'w-full min-h-0 shrink z-10',
} as const;

function ComposerCard(layout: CardLayout): React.JSX.Element {
  return (
    <LiquidGlass {...cardGlass}>
      <ComposerAttachments {...layout} />
      <ComposerText {...layout} />
      <ComposerToolbar {...layout} />
    </LiquidGlass>
  );
}

function ComposerAttachments(
  layout: AttachmentLayout,
): React.JSX.Element | null {
  if (layout.props.draft.attachments.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3 px-4 pt-3"
    >
      <ComposerAttachmentItems {...layout} />
    </ScrollView>
  );
}

interface AttachedItemProps {
  layout: AttachmentLayout;
  attachment: ComposerDraft['attachments'][number];
}

function ComposerAttachmentItems(layout: AttachmentLayout): React.JSX.Element {
  return (
    <>
      {layout.props.draft.attachments.map((attachment) => (
        <ComposerAttachedItem
          key={attachment.id}
          layout={layout}
          attachment={attachment}
        />
      ))}
    </>
  );
}

function ComposerAttachedItem(item: AttachedItemProps): React.JSX.Element {
  const { layout, attachment } = item;

  const onRemove = (): void =>
    layout.props.onDraftChange(
      removeAttachment(layout.props.draft, attachment.id),
    );

  return (
    <ComposerAttachmentCard
      attachment={attachment}
      disabled={layout.inactive}
      onRemove={onRemove}
    />
  );
}

function removeAttachment(draft: ComposerDraft, id: string): ComposerDraft {
  return {
    ...draft,
    attachments: draft.attachments.filter((attached) => attached.id !== id),
  };
}

type MessageField = React.ComponentProps<typeof RichTextarea>;

function useComposerText(layout: TextLayout): MessageField {
  const suggestions = useSuggestionSources(layout.props);
  const followUp = useFollowUpSuggestion(layout.props, layout.inactive);
  const props = { ...layout.props, onDraftChange: followUp.changeDraft };

  return {
    ...textInputProps({ ...layout, props }),
    inlineSuggestion: followUp.inlineSuggestion,
    ref: layout.field.attach,
    suggestions,
  };
}

function ComposerText(layout: TextLayout): React.JSX.Element {
  const field = useComposerText(layout);

  return (
    <>
      <RichTextarea {...field} />
      <FollowUpAcceptance suggestion={field.inlineSuggestion} />
    </>
  );
}

const acceptanceLook = {
  label: 'Use suggestion',
  variant: 'text',
  size: 'sm',
} as const;

function FollowUpAcceptance({
  suggestion,
}: {
  suggestion: React.ComponentProps<typeof RichTextarea>['inlineSuggestion'];
}): React.JSX.Element | null {
  if (!suggestion) return null;

  return (
    <View className="items-end px-4 pb-2">
      <Button {...acceptanceLook} onPress={suggestion.onAccept} />
    </View>
  );
}

// The padding sits on the field, so a press anywhere in the white area focuses it.
const textFieldLook = {
  accessibilityLabel: 'Message',
  fieldClassName: 'px-4 wide:px-4.75 pt-3 pb-2',
} as const;

function textInputProps({
  props,
  inactive,
  send,
}: Omit<TextLayout, 'field'>): React.ComponentProps<typeof RichTextarea> {
  return {
    ...textFieldLook,
    autoFocus: !inactive,
    placeholder: props.placeholder ?? '',
    value: props.draft.text,
    disabled: inactive,
    ...draftChanges(props),
    onSubmit: send,
  };
}

export function ComposerControls(layout: CardLayout): React.JSX.Element {
  return (
    <View className="w-full min-h-0 shrink">
      <SuggestionListHost />
      <ComposerCard {...layout} />
      <ComposerBottomTray {...layout} />
    </View>
  );
}
