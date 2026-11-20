import {
  defaultVoiceCallOptions,
  type VoiceCallOptions,
} from '@repo/contracts';
import type * as React from 'react';
import {
  useDeviceMeters,
  useVoiceConnection,
  useVoiceDevices,
  useVoiceVisualiser,
  type DeviceMetersState,
} from '#features/voice';
import { useNavigate } from '#lib/product/navigation/navigation';
import { useVoiceSettings } from './use-voice-settings';
import { VoiceDetailView } from './voice-detail-view';
import type {
  VoiceDetailViewProps,
  VoiceDetailViewState,
} from './voice-detail-view-props';

type DeviceRows = Pick<VoiceDetailViewState, 'visualiser' | 'adjustsGain'>;

// Where this App carries a call's sound it draws the call and sets the microphone's gain; elsewhere neither row shows.
function useDeviceRows(): DeviceRows {
  const carries = useVoiceConnection() !== null;
  const { kind, choose } = useVoiceVisualiser();

  return carries
    ? { visualiser: { kind, onChange: choose }, adjustsGain: true }
    : {};
}

// The saved options as levels from 0 to 1: gain and volume are kept as percentages.
const percent = 100;

const optionsOf = (page: VoiceDetailViewProps): VoiceCallOptions =>
  page.voice.status === 'loaded'
    ? page.voice.settings.options
    : defaultVoiceCallOptions;

// Where the App holds no call it lists no devices, and the meters never listen.
const noDevices = { named: false, microphone: null, speaker: null };

// The meters listen once the browser has named its devices: it has been allowed the microphone, so opening it asks nothing.
function useMeters(page: VoiceDetailViewProps): DeviceMetersState {
  const options = optionsOf(page);
  const devices = page.devices ?? noDevices;

  return useDeviceMeters({
    listening: devices.named,
    microphone: devices.microphone,
    speaker: devices.speaker,
    gain: options.microphoneGain / percent,
    volume: options.volume / percent,
  });
}

export function VoiceDetailScreen(): React.JSX.Element {
  const navigate = useNavigate();
  const page = { ...useVoiceSettings(), ...useVoiceDevices() };
  const meters = useMeters(page);

  return (
    <VoiceDetailView
      {...page}
      {...useDeviceRows()}
      meters={page.devices ? meters : undefined}
      onBack={() => navigate('/settings')}
    />
  );
}
