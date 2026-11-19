import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import type {
  AudioDevice,
  AudioDevices,
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

const microphonePicker = (
  devices: VoiceDevices,
  onChange: Chooser,
): React.JSX.Element => (
  <FieldGroup.Picker
    title="Microphone"
    presentation="menu"
    value={valueOf(devices.microphones, devices.microphone)}
    options={optionsOf(devices.microphones)}
    onValueChange={(value) => onChange({ microphone: chosenOf(value) })}
  />
);

const speakerPicker = (
  devices: VoiceDevices,
  onChange: Chooser,
): React.JSX.Element => (
  <FieldGroup.Picker
    title="Speaker"
    presentation="menu"
    value={valueOf(devices.speakers, devices.speaker)}
    options={optionsOf(devices.speakers)}
    onValueChange={(value) => onChange({ speaker: chosenOf(value) })}
  />
);

// The microphone and speaker a Voice call uses on this Device. Called, not rendered, like the page's other sections.
export const devicesSection = (
  devices: VoiceDevices,
  onChange: Chooser,
): React.JSX.Element => (
  <FieldGroup.Section title="Devices" footer={footerOf(devices)}>
    {microphonePicker(devices, onChange)}
    {speakerPicker(devices, onChange)}
  </FieldGroup.Section>
);
