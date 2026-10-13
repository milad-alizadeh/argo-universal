import type { ToolbarLayout } from './composer-toolbar-types';
import type { ComposerLayout, ComposerProps } from './composer-types';
export type AttachmentLayout = Pick<ComposerLayout, 'inactive'> & {
  props: Pick<ComposerProps, 'draft' | 'onDraftChange'>;
};
export type TextLayout = Pick<ComposerLayout, 'inactive' | 'send'> & {
  props: Pick<ComposerProps, 'draft' | 'onDraftChange' | 'placeholder'>;
};
export type WarningLayout = Pick<ComposerLayout, 'oversized'> & {
  props: Pick<ComposerProps, 'error'>;
};
export type CardLayout = ToolbarLayout &
  AttachmentLayout &
  TextLayout &
  WarningLayout;

export type ControlsLayout = CardLayout &
  Pick<ComposerLayout, 'setControlsHeight'>;
