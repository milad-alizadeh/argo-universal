import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import type {
  AudioDevice,
  AudioDevices,
  DeviceMetersState,
  VoiceDeviceChoice,
} from '#features/conversation';
import type { VoiceDetailViewProps } from './conversation-detail-view-props';
import { HeldSliderRow } from './voice-held-rows';
import { settingsOf, waiting } from './conversation-settings-state';

// This Device's microphones and speakers, and the ones it chose; null follows the system.
export type VoiceDevices = AudioDevices & VoiceDeviceChoice;

type Options = React.ComponentProps<typeof FieldGroup.Picker>['options'];

type Chooser = (change: Partial<VoiceDeviceChoice>) => void;

// The picker's value for following the system; a browser never names a device this.
const systemDefault = 'system-default';

const optionsOf = (devices: AudioDevice[]): Options => [
  { value: systemDefault, label: 'System default' },
  ...devices.map(({ id, label }) => ({ value: id, label })),
];

// A chosen device that is not plugged in now shows as the system's, which is what a call would use.
const valueOf = (devices: AudioDevice[], chosen: string | null): string =>
  devices.some(({ id }) => id === chosen) ? (chosen ?? '') : systemDefault;

const chosenOf = (value: string): string | null =>
  value === systemDefault ? null : value;

type Accessory = React.ComponentProps<typeof FieldGroup.Picker>['accessory'];

// The Speaker row's test sound: play, then stop while it plays (ADR-0042, 2026-11-19).
const testLooks = {
  idle: { icon: 'play', label: 'Play a test sound' },
  playing: { icon: 'stop', label: 'Stop the test sound' },
} as const;

const testOf = (meters?: DeviceMetersState): Accessory =>
  meters && {
    ...testLooks[meters.testing ? 'playing' : 'idle'],
    onPress: meters.onTest,
  };

const microphonePicker = (
  devices: VoiceDevices,
  onChange: Chooser,
  meters?: DeviceMetersState,
): React.JSX.Element => (
  <FieldGroup.Picker
    title="Microphone"
    presentation="menu"
    meter={meters?.microphone}
    value={valueOf(devices.microphones, devices.microphone)}
    options={optionsOf(devices.microphones)}
    onValueChange={(value) => onChange({ microphone: chosenOf(value) })}
  />
);

const speakerPicker = (
  devices: VoiceDevices,
  onChange: Chooser,
  meters?: DeviceMetersState,
): React.JSX.Element => (
  <FieldGroup.Picker
    title="Speaker"
    presentation="menu"
    meter={meters?.speaker}
    accessory={testOf(meters)}
    value={valueOf(devices.speakers, devices.speaker)}
    options={optionsOf(devices.speakers)}
    onValueChange={(value) => onChange({ speaker: chosenOf(value) })}
  />
);

const footerOf = (devices: VoiceDevices | undefined): string =>
  devices?.named === false
    ? 'Microphone and speaker names appear after the first Conversation.'
    : 'Kept on this Device. A running Conversation changes at once.';

const ignore = (): void => undefined;

const loudest = 100;

const strongestGain = 200;

const gainRow = (props: VoiceDetailViewProps): React.JSX.Element | null =>
  props.adjustsGain ? (
    <HeldSliderRow
      key="gain"
      title="Microphone gain"
      value={settingsOf(props).options.microphoneGain}
      max={strongestGain}
      disabled={waiting(props)}
      onCommit={(microphoneGain) =>
        props.onCallOptionsChange({ microphoneGain })
      }
    />
  ) : null;

const volumeRow = (props: VoiceDetailViewProps): React.JSX.Element => (
  <HeldSliderRow
    key="volume"
    title="Volume"
    value={settingsOf(props).options.volume}
    max={loudest}
    disabled={waiting(props)}
    onCommit={(volume) => props.onCallOptionsChange({ volume })}
  />
);

const microphoneRow = (
  props: VoiceDetailViewProps,
): React.JSX.Element | null =>
  props.devices
    ? microphonePicker(
        props.devices,
        props.onDevicesChange ?? ignore,
        props.meters,
      )
    : null;

const speakerRow = (props: VoiceDetailViewProps): React.JSX.Element | null =>
  props.devices
    ? speakerPicker(
        props.devices,
        props.onDevicesChange ?? ignore,
        props.meters,
      )
    : null;

/*
 * This Device's sound on a call: each device with its level, gain under the microphone and volume under the speaker.
 * Where the App holds no call there are no devices, and only the sliders it can set show. Called, not rendered, like
 * the page's other sections.
 */
export const audioSection = (
  props: VoiceDetailViewProps,
): React.JSX.Element => (
  <FieldGroup.Section
    key="audio"
    title="Microphone and speaker"
    footer={footerOf(props.devices)}
  >
    {microphoneRow(props)}
    {gainRow(props)}
    {speakerRow(props)}
    {volumeRow(props)}
  </FieldGroup.Section>
);
