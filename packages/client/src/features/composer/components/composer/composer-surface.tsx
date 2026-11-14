import { LiquidGlass } from '@repo/kit/primitives/content/liquid-glass';
import { RichTextarea } from '@repo/kit/primitives/controls/rich-textarea';
import type * as React from 'react';
import { Platform } from 'react-native';
import { ComposerAttachments } from './composer-card-attachments';
import type { CardLayout } from './composer-card-types';
import { ComposerToolbar } from './composer-toolbar';

type MessageField = React.ComponentProps<typeof RichTextarea>;

type SurfaceProps = { layout: CardLayout; field: MessageField; phone: boolean };

const cardGlass = {
  // The web's card shares its trays' and the glass sidebar's radius; a phone keeps its sheet's.
  corners: Platform.OS === 'web' ? 'container' : 'sheet',
  interactive: true,
  className: 'w-full min-h-0 shrink z-10',
} as const;

function ComposerText({
  field,
  phone,
}: {
  field: MessageField;
  phone: boolean;
}): React.JSX.Element {
  return (
    <RichTextarea
      {...field}
      inlineSuggestion={phone ? undefined : field.inlineSuggestion}
    />
  );
}

export function ComposerSurface(props: SurfaceProps): React.JSX.Element {
  const { layout, field, phone } = props;

  return (
    <LiquidGlass {...cardGlass}>
      <ComposerAttachments {...layout} />
      <ComposerText field={field} phone={phone} />
      <ComposerToolbar {...layout} />
    </LiquidGlass>
  );
}
