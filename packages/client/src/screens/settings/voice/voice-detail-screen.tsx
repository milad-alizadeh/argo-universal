import type * as React from 'react';
import {
  useVoiceConnection,
  useVoiceDevices,
  useVoiceVisualiser,
} from '#features/voice';
import { useNavigate } from '#lib/product/navigation/navigation';
import { useVoiceSettings } from './use-voice-settings';
import { VoiceDetailView } from './voice-detail-view';
import type { VoiceDetailViewState } from './voice-detail-view-props';

type DeviceRows = Pick<VoiceDetailViewState, 'visualiser' | 'adjustsGain'>;

// Where this App carries a call's sound it draws the call and sets the microphone's gain; elsewhere neither row shows.
function useDeviceRows(): DeviceRows {
  const carries = useVoiceConnection() !== null;
  const { kind, choose } = useVoiceVisualiser();

  return carries
    ? { visualiser: { kind, onChange: choose }, adjustsGain: true }
    : {};
}

export function VoiceDetailScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <VoiceDetailView
      {...useVoiceSettings()}
      {...useVoiceDevices()}
      {...useDeviceRows()}
      onBack={() => navigate('/settings')}
    />
  );
}
