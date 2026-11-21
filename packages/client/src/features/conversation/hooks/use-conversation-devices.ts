import { useEffect, useState } from 'react';
import { usePageConversationConnection } from '../stores/conversation-connection-context';
import {
  useConversationDeviceChoice,
  type ConversationDeviceChoice,
} from '../stores/conversation-device-choice';
import {
  type AudioDevices,
  noAudioDevices,
  watchAudioDevices,
} from '../utils/audio-devices';

type ConversationDeviceControls = {
  // Absent where the App cannot hold a call, so there is nothing to choose.
  devices?: AudioDevices & ConversationDeviceChoice;
  onDevicesChange: (change: Partial<ConversationDeviceChoice>) => void;
};

// The microphones and speakers plugged in now, listed again when one comes or goes.
export function useAudioDevices(watching: boolean): AudioDevices {
  const [devices, setDevices] = useState(noAudioDevices);

  useEffect(
    () =>
      watching
        ? watchAudioDevices(navigator.mediaDevices, setDevices)
        : undefined,
    [watching],
  );

  return devices;
}

// What Settings › Conversation shows and changes about this Device's microphone and speaker.
export function useConversationDevices(): ConversationDeviceControls {
  const holdsCalls = usePageConversationConnection() !== null;
  const devices = useAudioDevices(holdsCalls);
  const { choice, choose } = useConversationDeviceChoice();

  return {
    devices: holdsCalls ? { ...devices, ...choice } : undefined,
    onDevicesChange: choose,
  };
}
