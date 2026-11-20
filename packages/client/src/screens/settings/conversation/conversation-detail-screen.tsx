import {
  defaultConversationOptions,
  type ConversationOptions,
} from '@repo/contracts';
import type * as React from 'react';
import {
  useDeviceMeters,
  useConversationConnection,
  useConversationDevices,
  type DeviceMetersState,
} from '#features/conversation';
import { useNavigate } from '#lib/product/navigation/navigation';
import { useConversationSettings } from './use-conversation-settings';
import { ConversationDetailView } from './conversation-detail-view';
import type {
  ConversationDetailViewProps,
  ConversationDetailViewState,
} from './conversation-detail-view-props';

type DeviceRows = Pick<ConversationDetailViewState, 'adjustsGain'>;

// Where this App carries a Conversation's sound it sets the microphone's gain; elsewhere the row does not show.
function useDeviceRows(): DeviceRows {
  const carries = useConversationConnection() !== null;

  return carries ? { adjustsGain: true } : {};
}

// The saved options as levels from 0 to 1: gain and volume are kept as percentages.
const percent = 100;

const optionsOf = (page: ConversationDetailViewProps): ConversationOptions =>
  page.voice.status === 'loaded'
    ? page.voice.settings.options
    : defaultConversationOptions;

// Where the App holds no Conversation it lists no devices, and the meters never listen.
const noDevices = { named: false, microphone: null, speaker: null };

// The meters listen once the browser has named its devices: it has been allowed the microphone, so opening it asks nothing.
function useMeters(page: ConversationDetailViewProps): DeviceMetersState {
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

export function ConversationDetailScreen(): React.JSX.Element {
  const navigate = useNavigate();
  const page = { ...useConversationSettings(), ...useConversationDevices() };
  const meters = useMeters(page);

  return (
    <ConversationDetailView
      {...page}
      {...useDeviceRows()}
      meters={page.devices ? meters : undefined}
      onBack={() => navigate('/settings')}
    />
  );
}
