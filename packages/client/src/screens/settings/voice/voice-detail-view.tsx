import type { VoiceAvailability, VoiceSettings } from '@repo/contracts';
import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { callSection } from './voice-call-section';
import { EditorDialog, voiceSection } from './voice-choice-section';
import type { VoiceDetailViewProps } from './voice-detail-view-props';
import { devicesSection } from './voice-devices-section';
import { chosenProvider, settingsOf, waiting } from './voice-settings-state';

export type { VoiceDetailViewProps } from './voice-detail-view-props';

// The page as drawn: the phone layout, on a phone or a narrow web window, has no audio settings of its own (ADR-0026).
type Drawn = VoiceDetailViewProps & { audio: boolean };

export function VoiceDetailView(
  props: VoiceDetailViewProps,
): React.JSX.Element {
  return (
    <Screen title="Voice" onBack={props.onBack}>
      <SizeClass
        compact={
          <FieldGroup>{sectionsOf({ ...props, audio: false })}</FieldGroup>
        }
        wide={<FieldGroup>{sectionsOf({ ...props, audio: true })}</FieldGroup>}
      />
      <EditorDialog {...props} />
    </Screen>
  );
}

// Called, not rendered: the FieldGroup reads its sections by element type.
const sectionsOf = (props: Drawn): React.ReactNode[] => [
  switchSection(props),
  providerSection(props),
  voiceSection(props),
  callOf(props),
  devicesOf(props),
  statusSection(props),
];

const switchFooter =
  'Talk to a Session from its Composer. With this off, the Composer never shows the voice button.';

function switchSection(props: VoiceDetailViewProps): React.JSX.Element {
  return (
    <FieldGroup.Section key="switch" footer={switchFooter}>
      <FieldGroup.Toggle
        title="Voice calls"
        value={settingsOf(props).enabled}
        disabled={waiting(props)}
        onValueChange={props.onEnabledChange}
      />
    </FieldGroup.Section>
  );
}

const reasonOf = (
  availability: VoiceAvailability | undefined,
): string | undefined =>
  availability?.usable === false ? availability.reason : undefined;

const providerOptions = (
  settings: VoiceSettings,
): React.ComponentProps<typeof FieldGroup.Picker>['options'] =>
  settings.providers.map((provider) => ({
    value: provider.id,
    label: provider.experimental
      ? `${provider.label} (experimental)`
      : provider.label,
  }));

// Why the chosen provider cannot be used, when it cannot.
const providerSection = (props: VoiceDetailViewProps): React.JSX.Element => (
  <FieldGroup.Section
    key="provider"
    footer={reasonOf(chosenProvider(settingsOf(props))?.availability)}
  >
    {providerPicker(props, settingsOf(props))}
  </FieldGroup.Section>
);

const providerPicker = (
  props: VoiceDetailViewProps,
  settings: VoiceSettings,
): React.JSX.Element => (
  <FieldGroup.Picker
    title="Voice provider"
    presentation="menu"
    value={settings.provider ?? ''}
    options={providerOptions(settings)}
    disabled={waiting(props)}
    onValueChange={props.onProviderChange}
  />
);

const callOf = (props: Drawn): React.JSX.Element =>
  callSection({
    audio: props.audio,
    options: settingsOf(props).options,
    disabled: waiting(props),
    adjustsGain: props.adjustsGain,
    visualiser: props.visualiser,
    onChange: props.onCallOptionsChange,
  });

const ignore = (): void => undefined;

// The phone layout shows no devices.
const shownDevices = (props: Drawn): Drawn['devices'] =>
  props.audio ? props.devices : undefined;

function devicesOf(props: Drawn): React.JSX.Element | null {
  const devices = shownDevices(props);
  const onChange = props.onDevicesChange ?? ignore;

  return devices ? devicesSection(devices, onChange, props.meters) : null;
}

const messages = {
  loading: 'Loading Voice settings…',
  error: 'Could not load Voice settings.',
  disconnected: 'Connect to the Server to change Voice settings.',
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
