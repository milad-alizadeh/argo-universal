import type { ComposerLayout, ComposerProps } from './composer-types';

export type AttachLayout = Pick<
  ComposerLayout,
  'wide' | 'inactive' | 'field'
> & {
  props: Pick<
    ComposerProps,
    | 'onAttachImages'
    | 'onAttachCamera'
    | 'onAttachFiles'
    | 'slashCommands'
    | 'onCreateGoal'
  >;
};

export type AgentControlLayout = Pick<
  ComposerLayout,
  'configurationInactive'
> & { props: Pick<ComposerProps, 'configuration'> };

export type PhoneStatusLayout = Pick<ComposerLayout, 'wide' | 'inactive'> & {
  props: Pick<ComposerProps, 'status'>;
};

export type ConfigurationActionsLayout = Pick<ComposerLayout, 'inactive'> & {
  props: Pick<ComposerProps, 'configuration'>;
};

export type SendLayout = Pick<ComposerLayout, 'sendState' | 'send'> & {
  props: Pick<ComposerProps, 'disabled' | 'onStop'>;
};

export type LeftControlsLayout = AttachLayout &
  AgentControlLayout &
  PhoneStatusLayout;

export type RightControlsLayout = ConfigurationActionsLayout & SendLayout;

export type ToolbarLayout = LeftControlsLayout & RightControlsLayout;
