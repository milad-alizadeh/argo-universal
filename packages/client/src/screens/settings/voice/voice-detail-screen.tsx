import type * as React from 'react';
import { useVoiceDevices } from '#features/voice';
import { useNavigate } from '#lib/product/navigation/navigation';
import { useVoiceSettings } from './use-voice-settings';
import { VoiceDetailView } from './voice-detail-view';

export function VoiceDetailScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <VoiceDetailView
      {...useVoiceSettings()}
      {...useVoiceDevices()}
      onBack={() => navigate('/settings')}
    />
  );
}
