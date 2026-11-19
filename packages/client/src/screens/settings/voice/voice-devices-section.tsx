import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import type {
  AudioDevice,
  AudioDevices,
  DeviceMetersState,
  VoiceDeviceChoice,
} from '#features/voice';

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

const footerOf = (devices: VoiceDevices): string =>
  devices.named
    ? 'Kept on this Device. A running Voice call switches at once.'
    : 'Microphone and speaker names appear after the first Voice call.';

type Accessory = React.ComponentProps<typeof FieldGroup.Picker>['accessory'];

// The Speaker row's test sound: play, then stop while it plays (ADR-0042, 2026-11-19).
const testOf = (meters?: DeviceMetersState): Accessory =>
  meters && {
    icon: meters.testing ? 'stop' : 'play',
    label: meters.testing ? 'Stop the test sound' : 'Play a test sound',
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

/*
 * The microphone and speaker a Voice call uses on this Device, each with its level where the App measures it. Called,
 * not rendered, like the page's other sections.
 */
export const devicesSection = (
  devices: VoiceDevices,
  onChange: Chooser,
  meters?: DeviceMetersState,
): React.JSX.Element => (
  <FieldGroup.Section key="devices" title="Devices" footer={footerOf(devices)}>
    {microphonePicker(devices, onChange, meters)}
    {speakerPicker(devices, onChange, meters)}
  </FieldGroup.Section>
);
