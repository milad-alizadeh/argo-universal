import type { ToolbarLayout } from './composer-toolbar-types';
import type { ComposerLayout, ComposerProps } from './composer-types';

export type AttachmentLayout = Pick<ComposerLayout, 'inactive'> & {
  props: Pick<ComposerProps, 'draft' | 'onDraftChange'>;
};

export type TextLayout = Pick<ComposerLayout, 'inactive' | 'send' | 'field'> & {
  props: Pick<
    ComposerProps,
    | 'draft'
    | 'onDraftChange'
    | 'placeholder'
    | 'slashCommands'
    | 'suggestionSources'
  >;
};

export type CardLayout = ToolbarLayout & AttachmentLayout & TextLayout;
