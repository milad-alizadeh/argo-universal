import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DeviceSound,
  ListeningMicrophone,
  PlayingChime,
} from '../types/device-sound';
import { DeviceMeters } from './device-meters';

type FakeMicrophone = ListeningMicrophone & { loud: number; gain: number };

type FakeChime = PlayingChime & { finish: () => void };

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
  const done: { finish?: () => void } = {};
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

function fakes(): Fakes {
  const microphone = fakeMicrophone();
  const chime = fakeChime();

  const sound: DeviceSound = {
    listen: vi.fn<DeviceSound['listen']>(() => Promise.resolve(microphone)),
    chime: vi.fn<DeviceSound['chime']>(() => chime),
  };

  return { sound, microphone, chime };
}

const sampleMs = 50;

describe('DeviceMeters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the microphone at the gain it was opened with', async () => {
    const { sound } = fakes();
    const meters = new DeviceMeters(sound);

    meters.setGain(1.5);
    await meters.listen('mic-usb');

    expect(sound.listen).toHaveBeenCalledWith('mic-usb', 1.5);
    expect(meters.microphone.level()).toBe(0.5);
  });

  it('reads nothing before a microphone opens, or when it is refused', async () => {
    const meters = new DeviceMeters({
      listen: (): Promise<ListeningMicrophone> =>
        Promise.reject(new Error('refused')),
      chime: fakes().sound.chime,
    });

    expect(meters.microphone.level()).toBe(0);
    await meters.listen(null);
    expect(meters.microphone.level()).toBe(0);
  });

  it('tells its listeners the level moved while something sounds', async () => {
    const meters = new DeviceMeters(fakes().sound);
    const moved = vi.fn<() => void>();
    meters.microphone.subscribe(moved);

    await meters.listen(null);
    vi.advanceTimersByTime(sampleMs * 3);

    expect(moved.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('changes the gain of the open microphone', async () => {
    const { sound, microphone } = fakes();
    const meters = new DeviceMeters(sound);

    await meters.listen(null);
    meters.setGain(2);

    expect(microphone.gain).toBe(2);
  });

  it('lets go of the microphone and stops sampling once it stops listening', async () => {
    const { sound, microphone } = fakes();
    const meters = new DeviceMeters(sound);
    const moved = vi.fn<() => void>();
    meters.microphone.subscribe(moved);

    await meters.listen(null);
    meters.stopListening();
    moved.mockClear();
    vi.advanceTimersByTime(sampleMs * 3);

    expect(microphone.stop).toHaveBeenCalled();
    expect(moved).not.toHaveBeenCalled();
    expect(meters.microphone.level()).toBe(0);
  });

  it('closes a microphone that opened after it stopped listening', async () => {
    const { sound, microphone } = fakes();
    const meters = new DeviceMeters(sound);

    const opening = meters.listen(null);
    meters.stopListening();
    await opening;

    expect(microphone.stop).toHaveBeenCalled();
    expect(meters.microphone.level()).toBe(0);
  });

  it('plays the test sound on the speaker at the volume, and shows its level', () => {
    const { sound } = fakes();
    const meters = new DeviceMeters(sound);

    meters.toggleTest('spk-headphones', 0.8);

    expect(sound.chime).toHaveBeenCalledWith('spk-headphones', 0.8);
    expect(meters.testing()).toBe(true);
    expect(meters.speaker.level()).toBe(0.75);
  });

  it('stops the test sound when pressed again', () => {
    const { sound, chime } = fakes();
    const meters = new DeviceMeters(sound);

    meters.toggleTest(null, 1);
    meters.toggleTest(null, 1);

    expect(chime.stop).toHaveBeenCalled();
    expect(meters.testing()).toBe(false);
    expect(meters.speaker.level()).toBe(0);
  });

  it('is done testing once the sound ends on its own', async () => {
    const { sound, chime } = fakes();
    const meters = new DeviceMeters(sound);

    meters.toggleTest(null, 1);
    chime.finish();
    await vi.runAllTimersAsync();

    expect(meters.testing()).toBe(false);
  });

  it('lets go of everything when closed', async () => {
    const { sound, microphone, chime } = fakes();
    const meters = new DeviceMeters(sound);

    await meters.listen(null);
    meters.toggleTest(null, 1);
    meters.close();

    expect(microphone.stop).toHaveBeenCalled();
    expect(chime.stop).toHaveBeenCalled();
  });
});
