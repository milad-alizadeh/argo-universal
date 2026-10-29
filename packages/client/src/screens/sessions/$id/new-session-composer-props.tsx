import type * as React from 'react';
import type {
  ComposerProps,
  ComposerConfigurationProps,
} from '#features/composer';
import { SessionCallout, ConfigurationStatus } from '#features/sessions';
import { composerDraftProps } from './new-session-draft';
import type { ReadySessionNewViewProps } from './session-new-view';

// A Send held by a failed open presents a phone's dismissed sheet again.
const calloutOf = ({
  callout,
  opening,
}: ReadySessionNewViewProps): React.ReactNode =>
  callout && <SessionCallout key={String(opening)} {...callout} />;

export const promptComposerProps = (
  props: ReadySessionNewViewProps,
): ComposerProps => ({
  ...composerDraftProps(props),
  slashCommands: props.slashCommands,
  onAttachImages: props.onAttachImages,
  onAttachFiles: props.onAttachFiles,
  onSend: props.onSend,
  configuration: configurationOf(props),
  placeholder: '',
  sendable: props.canOpen,
  callout: props.calloutInConfiguration ? undefined : calloutOf(props),
  error: props.attachmentError,
  errorKey: props.attachmentErrorKey,
});

const choicesOf = (
  props: ReadySessionNewViewProps,
): ComposerConfigurationProps['agentChoices'] =>
  props.opening
    ? undefined
    : {
        agents: props.agents,
        onChange: props.onAgentChange,
        onAdd: props.onAddAgents,
      };

const statusOf = (
  props: ReadySessionNewViewProps,
): ComposerConfigurationProps['status'] =>
  props.calloutInConfiguration && props.callout ? (
    <ConfigurationStatus {...props.callout} />
  ) : undefined;

const configurationOf = (
  props: ReadySessionNewViewProps,
): ComposerConfigurationProps => ({
  ...props.configuration,
  agentChoices: choicesOf(props),
  status: statusOf(props),
});
