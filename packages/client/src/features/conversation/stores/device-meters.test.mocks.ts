import { vi } from 'vitest';
import type {
  DeviceSound,
  ListeningMicrophone,
  PlayingChime,
} from '../types/device-sound';

// Stand-ins for the browser's microphone and test sound, for DeviceMeters' tests.
type FakeMicrophone = ListeningMicrophone & { loud: number; gain: number };

type FakeChime = PlayingChime & { finish: () => void };

// Where the chime's end is kept until a test finishes it.
type Finisher = { finish?: () => void };

function fakeMicrophone(): FakeMicrophone {
  const microphone: FakeMicrophone = {
    loud: 0.5,
    gain: 1,
    level: () => microphone.loud,
    setGain: (gain) => {
      microphone.gain = gain;
    },
    stop: vi.fn<() => void>(),
  };

  return microphone;
}

function fakeChime(): FakeChime {
  const done: Finisher = {};

  const ended = new Promise<void>((resolve) => {
    done.finish = resolve;
  });

  return {
    level: () => 0.75,
    stop: vi.fn<() => void>(),
    ended,
    finish: () => done.finish?.(),
  };
}

type Fakes = {
  sound: DeviceSound;
  microphone: FakeMicrophone;
  chime: FakeChime;
};

export function fakes(): Fakes {
  const microphone = fakeMicrophone();
  const chime = fakeChime();

  const sound: DeviceSound = {
    listen: vi.fn<DeviceSound['listen']>(() => Promise.resolve(microphone)),
    chime: vi.fn<DeviceSound['chime']>(() => chime),
  };

  return { sound, microphone, chime };
}
