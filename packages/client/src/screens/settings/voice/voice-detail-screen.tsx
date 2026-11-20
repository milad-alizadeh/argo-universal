import type * as React from 'react';
import { useVoiceConnection, useVoiceDevices } from '#features/voice';
import { useNavigate } from '#lib/product/navigation/navigation';
import { useVoiceSettings } from './use-voice-settings';
import { VoiceDetailView } from './voice-detail-view';
import type { VoiceDetailViewState } from './voice-detail-view-props';

type DeviceRows = Pick<VoiceDetailViewState, 'adjustsGain'>;

// Where this App carries a call's sound it sets the microphone's gain; elsewhere the row does not show.
function useDeviceRows(): DeviceRows {
  const carries = useVoiceConnection() !== null;

  return carries ? { adjustsGain: true } : {};
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
