import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ListeningMicrophone } from '../types/device-sound';
import { DeviceMeters } from './device-meters';
import { fakes } from './device-meters.test.mocks';

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

  it('opens the wanted microphone only while a glyph shows it', async () => {
    const { sound, microphone } = fakes();
    const meters = new DeviceMeters(sound);

    meters.want('mic-usb', true);
    expect(sound.listen).not.toHaveBeenCalled();

    const leave = meters.microphone.subscribe(() => {});
    await vi.advanceTimersByTimeAsync(1);
    expect(sound.listen).toHaveBeenCalledWith('mic-usb', 1);

    leave();
    expect(microphone.stop).toHaveBeenCalled();
  });

  it('never opens a microphone it may not', () => {
    const { sound } = fakes();
    const meters = new DeviceMeters(sound);

    meters.microphone.subscribe(() => {});
    meters.want(null, false);

    expect(sound.listen).not.toHaveBeenCalled();
  });

  it('lets go of the microphone once it may not listen, as when a call starts', async () => {
    const { sound, microphone } = fakes();
    const meters = new DeviceMeters(sound);

    meters.microphone.subscribe(() => {});
    meters.want(null, true);
    await vi.advanceTimersByTimeAsync(1);
    meters.want(null, false);

    expect(microphone.stop).toHaveBeenCalled();
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
