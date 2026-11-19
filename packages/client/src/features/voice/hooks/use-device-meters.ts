import { useEffect, useState, useSyncExternalStore } from 'react';
import { browserDeviceSound } from '../stores/browser-device-sound';
import { DeviceMeters, type DeviceMeter } from '../stores/device-meters';
import type { DeviceSound } from '../types/device-sound';

export interface DeviceMeterInputs {
  // Whether the microphone may be opened: the page shows its devices, the browser has allowed it, and no call runs.
  listening: boolean;
  // null follows the system's.
  microphone: string | null;
  speaker: string | null;
  // 1 is the microphone as it is.
  gain: number;
  // From 0 to 1.
  volume: number;
}

export interface DeviceMetersState {
  microphone: DeviceMeter;
  speaker: DeviceMeter;
  // The test sound is playing.
  testing: boolean;
  // Plays the test sound, or stops it.
  onTest: () => void;
}

// The microphone is open while the page may listen, follows the chosen one, and follows the saved gain.
function useListening(meters: DeviceMeters, inputs: DeviceMeterInputs): void {
  const { listening, microphone, gain } = inputs;

  useEffect(() => meters.setGain(gain), [meters, gain]);

  useEffect(() => {
    if (!listening) return;

    void meters.listen(microphone);

    return (): void => meters.stopListening();
  }, [meters, listening, microphone]);
}

// The meters this page keeps, let go of when it closes.
function useMeters(sound: DeviceSound): DeviceMeters {
  const [meters] = useState(() => new DeviceMeters(sound));

  useEffect(() => (): void => meters.close(), [meters]);

  return meters;
}

/*
 * Settings › Voice's meters: the chosen microphone's level while the page is open, and a short test sound on the
 * chosen speaker at the saved volume. Leaving the page lets go of both.
 */
export function useDeviceMeters(
  inputs: DeviceMeterInputs,
  sound: DeviceSound = browserDeviceSound,
): DeviceMetersState {
  const meters = useMeters(sound);
  const testing = useSyncExternalStore(meters.speaker.subscribe, () =>
    meters.testing(),
  );

  useListening(meters, inputs);

  return {
    microphone: meters.microphone,
    speaker: meters.speaker,
    testing,
    onTest: () => meters.toggleTest(inputs.speaker, inputs.volume),
  };
}
