import { useEffect, useState, useSyncExternalStore } from 'react';
import { browserDeviceSound } from '../stores/browser-device-sound';
import { DeviceMeters, type DeviceMeter } from '../stores/device-meters';
import type { DeviceSound } from '../types/device-sound';
import { useVoiceStatus } from './use-conversation-status';

export interface DeviceMeterInputs {
  // Whether the microphone may be opened: the browser has allowed it.
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

/*
 * The microphone may be open while the page may listen and no call runs, so a call keeps its microphone to itself and
 * the glyph stays unlit; it follows the chosen one and the saved gain.
 */
function useListening(meters: DeviceMeters, inputs: DeviceMeterInputs): void {
  const { microphone, gain } = inputs;
  const quiet = useVoiceStatus().call === null;
  const allowed = inputs.listening && quiet;

  useEffect(() => meters.setGain(gain), [meters, gain]);
  useEffect(
    () => meters.want(microphone, allowed),
    [meters, microphone, allowed],
  );
}

// Whether the test sound plays: the glyphs move many times a second, but this changes only when it starts or stops.
const useTesting = (meters: DeviceMeters): boolean =>
  useSyncExternalStore(meters.speaker.subscribe, () => meters.testing());

// The meters this page keeps, let go of when it closes.
function useMeters(sound: DeviceSound): DeviceMeters {
  const [meters] = useState(() => new DeviceMeters(sound));

  useEffect(() => (): void => meters.close(), [meters]);

  return meters;
}

/*
 * Settings › Voice's meters: the chosen microphone's level while its glyph is drawn, and a short test sound on the
 * chosen speaker at the saved volume. Leaving the page lets go of both.
 */
export function useDeviceMeters(
  inputs: DeviceMeterInputs,
  sound: DeviceSound = browserDeviceSound,
): DeviceMetersState {
  const meters = useMeters(sound);
  const testing = useTesting(meters);

  useListening(meters, inputs);

  return {
    microphone: meters.microphone,
    speaker: meters.speaker,
    testing,
    onTest: () => meters.toggleTest(inputs.speaker, inputs.volume),
  };
}
