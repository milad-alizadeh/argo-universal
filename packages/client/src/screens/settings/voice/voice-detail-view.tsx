import type { VoiceAvailability, VoiceSettings } from '@repo/contracts';
import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import type { VoiceDeviceChoice } from '#features/voice';
import { devicesSection, type VoiceDevices } from './voice-devices-section';

export type VoiceSettingsLoad =
  | { status: 'loading' | 'error' | 'disconnected' }
  | { status: 'loaded'; settings: VoiceSettings };

export interface VoiceDetailViewProps {
  voice: VoiceSettingsLoad;
  // Only where the App can hold a call; elsewhere there is nothing to choose.
  devices?: VoiceDevices;
  saving?: boolean;
  error?: string;
  onEnabledChange: (enabled: boolean) => void;
  onProviderChange: (provider: string) => void;
  onVoiceChange: (voice: string) => void;
  onDevicesChange?: (change: Partial<VoiceDeviceChoice>) => void;
  onRetry: () => void;
  onBack?: () => void;
}

export function VoiceDetailView(
  props: VoiceDetailViewProps,
): React.JSX.Element {
  return (
    <Screen title="Voice" onBack={props.onBack}>
      <FieldGroup>
        {switchSection(props)}
        {providerSection(props)}
        {voiceSection(props)}
        {devicesOf(props)}
        {statusSection(props)}
      </FieldGroup>
    </Screen>
  );
}

const nothing: VoiceSettings = {
  enabled: false,
  provider: null,
  voice: null,
  providers: [],
  voices: [],
};

// What is chosen and offered; nothing until the Server has answered.
const settingsOf = (props: VoiceDetailViewProps): VoiceSettings =>
  props.voice.status === 'loaded' ? props.voice.settings : nothing;

const waiting = (props: VoiceDetailViewProps): boolean =>
  props.voice.status !== 'loaded' || props.saving === true;

const switchFooter =
  'Talk to a Session from its Composer. With this off, the Composer never shows the voice button.';

function switchSection(props: VoiceDetailViewProps): React.JSX.Element {
  return (
    <FieldGroup.Section footer={switchFooter}>
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

// Why the chosen provider cannot be used, when it cannot.
const unusableReason = (settings: VoiceSettings): string | undefined =>
  reasonOf(
    settings.providers.find(({ id }) => id === settings.provider)?.availability,
  );

const providerOptions = (
  settings: VoiceSettings,
): React.ComponentProps<typeof FieldGroup.Picker>['options'] =>
  settings.providers.map((provider) => ({
    value: provider.id,
    label: provider.experimental
      ? `${provider.label} (experimental)`
      : provider.label,
  }));

function providerSection(props: VoiceDetailViewProps): React.JSX.Element {
  const settings = settingsOf(props);

  return (
    <FieldGroup.Section footer={unusableReason(settings)}>
      <FieldGroup.Picker
        title="Voice provider"
        presentation="menu"
        value={settings.provider ?? ''}
        options={providerOptions(settings)}
        disabled={waiting(props)}
        onValueChange={props.onProviderChange}
      />
    </FieldGroup.Section>
  );
}

const voiceOptions = (
  settings: VoiceSettings,
): React.ComponentProps<typeof FieldGroup.Picker>['options'] =>
  settings.voices.map(({ id, label }) => ({ value: id, label }));

// The chosen voice as its provider describes it, else what choosing it does.
const voiceFooter = (settings: VoiceSettings): string =>
  settings.voices.find(({ id }) => id === settings.voice)?.description ??
  'The next call speaks with this voice.';

function voiceSection(props: VoiceDetailViewProps): React.JSX.Element {
  const settings = settingsOf(props);

  return (
    <FieldGroup.Section footer={voiceFooter(settings)}>
      <FieldGroup.Picker
        title="Voice"
        presentation="menu"
        value={settings.voice ?? ''}
        options={voiceOptions(settings)}
        disabled={waiting(props)}
        onValueChange={props.onVoiceChange}
      />
    </FieldGroup.Section>
  );
}

const ignore = (): void => undefined;

const devicesOf = (props: VoiceDetailViewProps): React.JSX.Element | null =>
  props.devices
    ? devicesSection(props.devices, props.onDevicesChange ?? ignore)
    : null;

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
    <FieldGroup.Section footer={message}>
      {retryButton(props)}
    </FieldGroup.Section>
  ) : null;
}
