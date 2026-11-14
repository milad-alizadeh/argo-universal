import type * as React from 'react';
import { ScrollView } from 'react-native';
import { ComposerAttachmentCard } from '../composer-attachment-card/composer-attachment-card';
import type { AttachmentLayout } from './composer-card-types';
import type { ComposerDraft } from './composer-types';

export function ComposerAttachments(
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
