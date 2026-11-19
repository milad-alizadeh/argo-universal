import { useEffect, useState } from 'react';
import {
  type AudioDevices,
  noAudioDevices,
  watchAudioDevices,
} from './audio-devices';
import { useVoiceConnection } from './voice-connection-context';
import {
  useVoiceDeviceChoice,
  type VoiceDeviceChoice,
} from './voice-device-choice';

type VoiceDeviceControls = {
  // Absent where the App cannot hold a call, so there is nothing to choose.
  devices?: AudioDevices & VoiceDeviceChoice;
  onDevicesChange: (change: Partial<VoiceDeviceChoice>) => void;
};

// The microphones and speakers plugged in now, listed again when one comes or goes.
function useAudioDevices(watching: boolean): AudioDevices {
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

// What Settings › Voice shows and changes about this Device's microphone and speaker.
export function useVoiceDevices(): VoiceDeviceControls {
  const holdsCalls = useVoiceConnection() !== null;
  const devices = useAudioDevices(holdsCalls);
  const { choice, choose } = useVoiceDeviceChoice();

  return {
    devices: holdsCalls ? { ...devices, ...choice } : undefined,
    onDevicesChange: choose,
  };
}
