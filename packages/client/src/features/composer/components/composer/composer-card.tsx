import type * as React from 'react';
import { View, ScrollView } from 'react-native';
import { LiquidGlass } from '#primitives/display/liquid-glass/liquid-glass-view';
import { RichTextarea } from '#primitives/inputs/rich-textarea/rich-textarea-view';
import { ComposerAttachmentCard } from '../composer-attachment-card/composer-attachment-card';
import type {
  CardLayout,
  ControlsLayout,
  AttachmentLayout,
  TextLayout,
} from './composer-card-types';
import { ComposerToolbar } from './composer-toolbar';
import { ComposerBottomTray } from './composer-trays';
import type { ComposerDraft } from './composer-types';

const cardGlass = {
  corners: 'card',
  interactive: true,
  className: 'w-full z-10',
  fallbackClassName:
    'rounded-2xl bg-glass-card native:bg-background shadow-glass web:backdrop-blur-glass web:backdrop-saturate-180',
} as const;

export function ComposerCard(layout: CardLayout): React.JSX.Element {
  return (
    <LiquidGlass {...cardGlass} glass={!layout.wide}>
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

function ComposerText(layout: TextLayout): React.JSX.Element {
  return (
    // The card's layout lets touches through, so a press on its open space reaches the glass.
    <View pointerEvents="box-none" className="px-4 pt-3 pb-2">
      <RichTextarea {...textInputProps(layout)} />
    </View>
  );
}

function textInputProps({
  props,
  inactive,
  send,
}: TextLayout): React.ComponentProps<typeof RichTextarea> {
  return {
    accessibilityLabel: 'Message',
    placeholder: props.placeholder ?? 'Message the Agent…',
    value: props.draft.text,
    editable: !inactive,
    onChangeText: (text) => props.onDraftChange({ ...props.draft, text }),
    onSubmit: send,
  };
}

export function ComposerControls(layout: ControlsLayout): React.JSX.Element {
  return (
    <View
      className="w-full"
      onLayout={({ nativeEvent }) =>
        layout.setControlsHeight(nativeEvent.layout.height)
      }
    >
      <ComposerCard {...layout} />
      <ComposerBottomTray {...layout} />
    </View>
  );
}
