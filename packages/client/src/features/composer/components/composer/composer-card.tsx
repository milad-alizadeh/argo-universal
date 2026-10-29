import { LiquidGlass } from '@repo/kit/primitives/content/liquid-glass';
import {
  RichTextarea,
  SuggestionListHost,
} from '@repo/kit/primitives/controls/rich-textarea';
import type * as React from 'react';
import { View, ScrollView } from 'react-native';
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

const cardGlass = {
  corners: 'sheet',
  interactive: true,
  className: 'w-full z-10',
} as const;

export function ComposerCard(layout: CardLayout): React.JSX.Element {
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

function ComposerText({
  field: { attach },
  ...layout
}: TextLayout): React.JSX.Element {
  const suggestions = useSuggestionSources(layout.props);

  return (
    <RichTextarea
      {...textInputProps(layout)}
      ref={attach}
      suggestions={suggestions}
    />
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
    <View className="w-full">
      <SuggestionListHost />
      <ComposerCard {...layout} />
      <ComposerBottomTray {...layout} />
    </View>
  );
}
