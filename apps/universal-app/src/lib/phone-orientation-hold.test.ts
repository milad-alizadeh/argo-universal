import { describe, expect, it } from 'vitest';
import {
  holdPhonesInPortraitOn,
  type OrientationDevice,
} from './phone-orientation-hold';

// A device that counts the locks it is asked for and lets a test bring the App to the foreground.
type FakeDevice = {
  device: OrientationDevice;
  locks: () => number;
  foreground: () => void;
};

function fakeDevice(smallestSide: number): FakeDevice {
  let locks = 0;
  const listeners: (() => void)[] = [];

  return {
    device: {
      smallestSide: () => smallestSide,
      lockPortrait: () => {
        locks += 1;
      },
      onForeground: (listener) => {
        listeners.push(listener);
      },
    },
    locks: () => locks,
    foreground: () => {
      for (const listener of listeners) listener();
    },
  };
}

describe('holdPhonesInPortraitOn', () => {
  it('locks a phone at once', () => {
    const { device, locks } = fakeDevice(411);

    holdPhonesInPortraitOn(device);

    expect(locks()).toBe(1);
  });

  it('locks a phone again each time the App comes to the foreground, since a new Activity holds no lock', () => {
    const { device, locks, foreground } = fakeDevice(411);

    holdPhonesInPortraitOn(device);
    foreground();
    foreground();

    expect(locks()).toBe(3);
  });

  it('leaves a tablet free to rotate', () => {
    const { device, locks, foreground } = fakeDevice(600);

    holdPhonesInPortraitOn(device);
    foreground();

    expect(locks()).toBe(0);
  });
});
