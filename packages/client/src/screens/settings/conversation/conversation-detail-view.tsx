import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { callSection } from './conversation-section';
import { EditorDialog, voiceSection } from './voice-choice-section';
import type { VoiceDetailViewProps } from './conversation-detail-view-props';
import { audioSection } from './conversation-devices-section';
import { settingsOf, waiting } from './conversation-settings-state';

export type { VoiceDetailViewProps } from './conversation-detail-view-props';

/*
 * The phone layout, on a phone or a narrow web window, sets no sound of its own, so it draws no Microphone and speaker
 * section (ADR-0026).
 */
export function VoiceDetailView(
  props: VoiceDetailViewProps,
): React.JSX.Element {
  return (
    <Screen title="Conversation" onBack={props.onBack}>
      <SizeClass
        compact={<FieldGroup>{sectionsOf(props)}</FieldGroup>}
        wide={<FieldGroup>{sectionsOf(props, audioSection(props))}</FieldGroup>}
      />
      <EditorDialog {...props} />
    </Screen>
  );
}

// Called, not rendered: the FieldGroup reads its sections by element type.
const sectionsOf = (
  props: VoiceDetailViewProps,
  audio: React.JSX.Element | null = null,
): React.ReactNode[] => [
  switchSection(props),
  voiceSection(props),
  callOf(props),
  audio,
  statusSection(props),
];

const switchFooter =
  'Talk to a Session from its Composer. With this off, the Composer never shows the Conversation button.';

function switchSection(props: VoiceDetailViewProps): React.JSX.Element {
  return (
    <FieldGroup.Section key="switch" footer={switchFooter}>
      <FieldGroup.Toggle
        title="Conversations"
        value={settingsOf(props).enabled}
        disabled={waiting(props)}
        onValueChange={props.onEnabledChange}
      />
    </FieldGroup.Section>
  );
}

const callOf = (props: VoiceDetailViewProps): React.JSX.Element =>
  callSection({
    options: settingsOf(props).options,
    disabled: waiting(props),
    onChange: props.onCallOptionsChange,
  });

const messages = {
  loading: 'Loading Conversation settings…',
  error: 'Could not load Conversation settings.',
  disconnected: 'Connect to the Server to change Conversation settings.',
  loaded: undefined,
};

const retryButton = (props: VoiceDetailViewProps): React.JSX.Element | null =>
  props.voice.status === 'error' ? (
    <Button label="Retry" variant="text" onPress={props.onRetry} />
  ) : null;

function statusSection(props: VoiceDetailViewProps): React.JSX.Element | null {
  const message = props.error ?? messages[props.voice.status];

  return message ? (
    <FieldGroup.Section key="status" footer={message}>
      {retryButton(props)}
    </FieldGroup.Section>
  ) : null;
}
