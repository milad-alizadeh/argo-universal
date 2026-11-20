import { LiquidGlass } from '@repo/kit/primitives/content/liquid-glass';
import { RichTextarea } from '@repo/kit/primitives/controls/rich-textarea';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import { ComposerAttachments } from './composer-card-attachments';
import type { CardLayout } from './composer-card-types';
import { ComposerDraftScroll } from './composer-draft-scroll';
import { edgeOf } from './composer-edge';
import { EdgeTypography } from './composer-edge-typography';
import { FollowUpAcceptance } from './composer-follow-up-acceptance';
import { ComposerToolbar } from './composer-toolbar';
import { ComposerTypography } from './composer-typography';

type MessageField = React.ComponentProps<typeof RichTextarea>;

type SurfaceProps = { layout: CardLayout; field: MessageField; phone: boolean };

const cardGlass = {
  // The web's card shares its trays' and the glass sidebar's radius; a phone keeps its sheet's.
  corners: Platform.OS === 'web' ? 'container' : 'sheet',
  interactive: true,
  className: 'w-full min-h-0 shrink z-10',
} as const;

/*
 * The Follow-up suggestion is the empty field's placeholder on every platform. The web accepts it with Tab; a
 * phone has no Tab, so its key sits at the end of the text row.
 */
function ComposerText(props: SurfaceProps): React.JSX.Element {
  return (
    <View className="w-full min-h-0 shrink flex-row items-start">
      <View className="min-h-0 min-w-0 flex-1 shrink">
        <RichTextarea {...props.field} />
      </View>
      <FollowUpAcceptance {...acceptanceProps(props)} />
    </View>
  );
}

const acceptanceProps = ({
  layout,
  field,
  phone,
}: SurfaceProps): React.ComponentProps<typeof FollowUpAcceptance> => ({
  suggestion: field.inlineSuggestion,
  phone,
  onAccept: layout.field.insertWord,
});

// The call's drawing along the card's top edge, in the kit's type rather than the prompt's, while a call asks for one.
function ComposerEdge({ props }: CardLayout): React.ReactNode {
  const edge = edgeOf(props);

  return edge ? <EdgeTypography>{edge}</EdgeTypography> : null;
}

// Keep the editor mounted across widths so crossing the breakpoint preserves keyboard focus.
function ComposerDraftBody(props: SurfaceProps): React.JSX.Element {
  const scrollWithParent =
    props.phone && props.layout.props.draft.attachments.length > 0;

  return (
    <ComposerDraftScroll followsCaret={scrollWithParent}>
      <ComposerAttachments {...props.layout} />
      <ComposerText {...props} field={{ ...props.field, scrollWithParent }} />
    </ComposerDraftScroll>
  );
}

export function ComposerSurface(props: SurfaceProps): React.JSX.Element {
  return (
    <LiquidGlass {...cardGlass}>
      <ComposerEdge {...props.layout} />
      <ComposerDraftBody {...props} />
      <ComposerTypography compact={props.phone}>
        <ComposerToolbar {...props.layout} />
      </ComposerTypography>
    </LiquidGlass>
  );
}
