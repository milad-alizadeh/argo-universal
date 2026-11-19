import { LiquidGlass } from '@repo/kit/primitives/content/liquid-glass';
import { RichTextarea } from '@repo/kit/primitives/controls/rich-textarea';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import { ComposerAttachments } from './composer-card-attachments';
import type { CardLayout } from './composer-card-types';
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

export function ComposerSurface(props: SurfaceProps): React.JSX.Element {
  return (
    <LiquidGlass {...cardGlass}>
      <ComposerAttachments {...props.layout} />
      <ComposerText {...props} />
      <ComposerTypography compact={props.phone}>
        <ComposerToolbar {...props.layout} />
      </ComposerTypography>
    </LiquidGlass>
  );
}
