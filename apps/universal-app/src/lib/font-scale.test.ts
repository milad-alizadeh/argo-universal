import type { DimensionsPayload } from 'react-native';
import { describe, expect, it } from 'vitest';
import {
  fontScaleUpdate,
  watchFontScaleOn,
  type FontScaleDevice,
  type Metrics,
} from './font-scale';

const metrics = {
  window: { width: 411, height: 866, scale: 2.625, fontScale: 1 },
  screen: { width: 411, height: 914, scale: 2.625, fontScale: 1 },
};

describe('fontScaleUpdate', () => {
  it('reports the scale the person has just chosen', () => {
    expect(fontScaleUpdate(metrics, 2)).toStrictEqual({
      window: { width: 411, height: 866, scale: 2.625, fontScale: 2 },
      screen: { width: 411, height: 914, scale: 2.625, fontScale: 2 },
    });
  });

  it('leaves the sizes alone, since only the text grew', () => {
    const update = fontScaleUpdate(metrics, 1.3);

    expect(update?.window?.height).toBe(866);
  });

  it('reports nothing when the scale has not moved', () => {
    expect(fontScaleUpdate(metrics, 1)).toBeUndefined();
  });
});

/*
 * A device that keeps what it was told, standing in for the Android one: the scale arrives from the Activity and
 * has to reach `Dimensions`, neither of which exists off a phone.
 */
type FakeDevice = {
  device: FontScaleDevice;
  send: (fontScale: number) => void;
  reported: DimensionsPayload[];
};

function fakeDevice(): FakeDevice {
  const listeners: ((fontScale: number) => void)[] = [];
  const reported: DimensionsPayload[] = [];

  const device = {
    onFontScale: (listener: (fontScale: number) => void): void =>
      void listeners.push(listener),
    metrics: (): Metrics => metrics,
    report: (update: DimensionsPayload): void => void reported.push(update),
  } satisfies FontScaleDevice;

  const send = (fontScale: number): void => {
    for (const listener of listeners) listener(fontScale);
  };

  return { device, send, reported };
}

describe('watchFontScaleOn', () => {
  it('reports a new scale against the sizes the window already has', () => {
    const { device, send, reported } = fakeDevice();
    watchFontScaleOn(device);

    send(2);

    expect(reported).toStrictEqual([
      {
        window: { width: 411, height: 866, scale: 2.625, fontScale: 2 },
        screen: { width: 411, height: 914, scale: 2.625, fontScale: 2 },
      },
    ]);
  });

  it('says nothing when the scale is the one the window already reports', () => {
    const { device, send, reported } = fakeDevice();
    watchFontScaleOn(device);

    send(1);

    expect(reported).toStrictEqual([]);
  });
});
